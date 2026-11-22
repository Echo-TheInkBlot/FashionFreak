-- Fashion Freak inventory schema
-- Tables: store_settings, staff, products, inventory_events
-- All stock changes go through apply_inventory_change() so every change is logged and can be undone.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type product_status as enum ('available', 'sold', 'hidden');
create type inventory_method as enum ('barcode', 'photo_ai', 'manual', 'pos_webhook', 'undo');
create type product_category as enum ('dresses','tops','denim','jackets','accessories','jewelry','vintage','shoes');

-- ---------- Settings (single row) ----------
create table store_settings (
  id boolean primary key default true check (id),        -- forces a single row
  sold_visible_days integer not null default 3 check (sold_visible_days between 0 and 60),
  ai_confidence_threshold numeric(3,2) not null default 0.85 check (ai_confidence_threshold between 0 and 1),
  low_stock_threshold integer not null default 1 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);
insert into store_settings default values;

-- ---------- Staff ----------
-- A logged-in Supabase user is staff only if they have a row here.
create table staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'staff' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

create or replace function is_service_role() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', '') = 'service_role';
$$;

-- ---------- Products ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^FF-[A-Z0-9]{4,12}$'),
  name text not null,
  description text not null default '',
  category product_category not null,
  size text,
  color text,
  tags text[] not null default '{}',
  price_cents integer not null check (price_cents >= 0),
  quantity integer not null default 1 check (quantity >= 0),
  status product_status not null default 'available',
  is_one_of_a_kind boolean not null default false,
  photos text[] not null default '{}',            -- storage paths or URLs; first is the cover
  ai_description text,                             -- visual notes used for photo matching
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz,
  constraint one_of_a_kind_qty check (not is_one_of_a_kind or quantity <= 1),
  constraint sold_means_zero check (status <> 'sold' or quantity = 0)
);
create index products_status_idx on products (status, sold_at desc);
create index products_category_idx on products (category);
create index products_created_idx on products (created_at desc);

-- ---------- Inventory events (audit log) ----------
create table inventory_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  change integer not null,                         -- e.g. -1 for a sale, +3 for a restock, 0 for a status-only change
  quantity_before integer not null,
  quantity_after integer not null,
  status_before product_status not null,
  status_after product_status not null,
  method inventory_method not null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  note text,
  staff_user uuid references auth.users(id),
  undoes_event_id uuid references inventory_events(id),
  undone_by_event_id uuid references inventory_events(id),
  created_at timestamptz not null default now(),
  constraint ai_needs_confidence check (method <> 'photo_ai' or confidence is not null)
);
create index inventory_events_product_idx on inventory_events (product_id, created_at desc);
create index inventory_events_created_idx on inventory_events (created_at desc);

-- ---------- Public visibility ----------
create or replace function is_publicly_visible(p_status product_status, p_sold_at timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select p_status = 'available'
      or (p_status = 'sold' and p_sold_at is not null
          and p_sold_at > now() - make_interval(days => (select sold_visible_days from store_settings)));
$$;

-- ---------- The one place stock changes happen ----------
-- p_change: negative = sold/removed, positive = restock.
-- p_set_status: optional explicit status ('hidden', 'available', 'sold').
create or replace function apply_inventory_change(
  p_product_id uuid,
  p_change integer,
  p_method inventory_method,
  p_confidence numeric default null,
  p_note text default null,
  p_set_status product_status default null
) returns inventory_events
language plpgsql security definer set search_path = public as $$
declare
  v_prod products;
  v_new_qty integer;
  v_new_status product_status;
  v_event inventory_events;
begin
  -- Staff (logged in) or a trusted server using the service-role key (e.g. a future POS webhook).
  if not (is_staff() or is_service_role()) then
    raise exception 'Only staff can change inventory' using errcode = '42501';
  end if;

  select * into v_prod from products where id = p_product_id for update;
  if not found then
    raise exception 'Product % not found', p_product_id using errcode = 'P0002';
  end if;

  if p_change < 0 and v_prod.status <> 'available' then
    raise exception 'Product % is % and cannot be sold', v_prod.sku, v_prod.status using errcode = 'P0001';
  end if;

  v_new_qty := v_prod.quantity + p_change;
  if v_new_qty < 0 then
    raise exception 'Not enough stock for % (have %, change %)', v_prod.sku, v_prod.quantity, p_change using errcode = 'P0001';
  end if;
  if v_prod.is_one_of_a_kind and v_new_qty > 1 then
    raise exception '% is one-of-a-kind; quantity cannot exceed 1', v_prod.sku using errcode = 'P0001';
  end if;

  v_new_status := coalesce(p_set_status,
    case
      when v_new_qty = 0 and v_prod.status = 'available' then 'sold'::product_status
      when v_new_qty > 0 and v_prod.status = 'sold' then 'available'::product_status
      else v_prod.status
    end);
  if v_new_status = 'sold' and v_new_qty > 0 then
    -- "mark sold" manually means sell everything that's left
    v_new_qty := 0;
  end if;

  update products set
    quantity = v_new_qty,
    status = v_new_status,
    sold_at = case when v_new_status = 'sold' and v_prod.status <> 'sold' then now()
                   when v_new_status <> 'sold' then null
                   else sold_at end,
    updated_at = now()
  where id = p_product_id;

  insert into inventory_events (product_id, change, quantity_before, quantity_after,
                                status_before, status_after, method, confidence, note, staff_user)
  values (p_product_id, v_new_qty - v_prod.quantity, v_prod.quantity, v_new_qty,
          v_prod.status, v_new_status, p_method, p_confidence, p_note, auth.uid())
  returning * into v_event;

  return v_event;
end $$;

-- Undo: restores the product to the state before the event, and logs that as its own event.
create or replace function undo_inventory_event(p_event_id uuid)
returns inventory_events
language plpgsql security definer set search_path = public as $$
declare
  v_ev inventory_events;
  v_prod products;
  v_undo inventory_events;
begin
  if not (is_staff() or is_service_role()) then
    raise exception 'Only staff can undo inventory changes' using errcode = '42501';
  end if;
  select * into v_ev from inventory_events where id = p_event_id for update;
  if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
  if v_ev.undone_by_event_id is not null then raise exception 'Event already undone' using errcode = 'P0001'; end if;
  if v_ev.method = 'undo' then raise exception 'Cannot undo an undo' using errcode = 'P0001'; end if;

  select * into v_prod from products where id = v_ev.product_id for update;
  -- Refuse if something else changed this product since, so we never clobber a later sale.
  if v_prod.quantity <> v_ev.quantity_after or v_prod.status <> v_ev.status_after then
    raise exception 'Product changed since this event; undo the later change first' using errcode = 'P0001';
  end if;

  update products set
    quantity = v_ev.quantity_before,
    status = v_ev.status_before,
    sold_at = case when v_ev.status_before = 'sold' then sold_at else null end,
    updated_at = now()
  where id = v_ev.product_id;

  insert into inventory_events (product_id, change, quantity_before, quantity_after,
                                status_before, status_after, method, note, staff_user, undoes_event_id)
  values (v_ev.product_id, v_ev.quantity_before - v_ev.quantity_after, v_ev.quantity_after, v_ev.quantity_before,
          v_ev.status_after, v_ev.status_before, 'undo', 'Undo', auth.uid(), v_ev.id)
  returning * into v_undo;

  update inventory_events set undone_by_event_id = v_undo.id where id = v_ev.id;
  return v_undo;
end $$;

-- updated_at on direct edits (name, price, photos...)
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger products_touch before update on products for each row execute function touch_updated_at();

-- Staff must not bypass the log when editing quantity/status directly.
create or replace function guard_stock_columns() returns trigger language plpgsql as $$
begin
  -- Inside the security-definer functions current_user is the function owner (postgres),
  -- so only direct edits by logged-in users (role "authenticated") are blocked.
  if (new.quantity is distinct from old.quantity or new.status is distinct from old.status)
     and current_user = 'authenticated' then
    raise exception 'Change quantity/status through apply_inventory_change()' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger products_guard before update on products for each row execute function guard_stock_columns();

-- ---------- Row Level Security ----------
alter table store_settings enable row level security;
alter table staff enable row level security;
alter table products enable row level security;
alter table inventory_events enable row level security;

create policy "settings readable by all" on store_settings for select using (true);
create policy "settings writable by owner" on store_settings for update
  using (exists (select 1 from staff where user_id = auth.uid() and role = 'owner'));

create policy "staff can read staff" on staff for select using (is_staff());

create policy "public reads visible products" on products for select
  using (is_publicly_visible(status, sold_at) or is_staff());
create policy "staff insert products" on products for insert with check (is_staff());
create policy "staff update products" on products for update using (is_staff()) with check (is_staff());
create policy "staff delete products" on products for delete using (is_staff());

create policy "staff read events" on inventory_events for select using (is_staff());
-- No insert/update policies on events: rows are only written by the security-definer functions.

grant execute on function apply_inventory_change(uuid, integer, inventory_method, numeric, text, product_status) to authenticated, service_role;
grant execute on function undo_inventory_event(uuid) to authenticated, service_role;
revoke execute on function apply_inventory_change(uuid, integer, inventory_method, numeric, text, product_status) from anon, public;
revoke execute on function undo_inventory_event(uuid) from anon, public;

-- ---------- Realtime ----------
alter publication supabase_realtime add table products;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;
create policy "public read product photos" on storage.objects for select using (bucket_id = 'product-photos');
create policy "staff upload product photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and is_staff());
create policy "staff update product photos" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and is_staff());
create policy "staff delete product photos" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and is_staff());

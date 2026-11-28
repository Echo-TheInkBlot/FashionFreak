-- Square sync: link each product to its Square catalog item and keep a log of webhook deliveries.

alter table products
  add column square_item_id text,
  add column square_variation_id text,
  add column square_synced_at timestamptz,
  add column square_sync_error text;
create unique index products_square_variation_idx on products (square_variation_id) where square_variation_id is not null;

-- Every Square webhook we accept, so a redelivered event is never applied twice and staff can see what came in.
create table square_webhook_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  result text,
  payload jsonb not null
);
alter table square_webhook_events enable row level security;
create policy "staff read square events" on square_webhook_events for select using (is_staff());
-- Inserts come only from the server using the service-role key (bypasses RLS).

-- Run after shim + migration + seed. Fails loudly (ON_ERROR_STOP) if a rule is broken.
\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
insert into auth.users values ('11111111-1111-1111-1111-111111111111', 'staff@example.com'),
                              ('22222222-2222-2222-2222-222222222222', 'rando@example.com');
insert into staff values ('11111111-1111-1111-1111-111111111111', 'Demo Staff', 'owner');

-- 1. Public sees available + sold within 3 days, not the 6-day-old sale.
set role anon; select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  assert (select count(*) from products where sku = 'FF-PNKOVR') = 0, 'old sold item should be hidden';
  assert (select count(*) from products where sku = 'FF-PSYDNM') = 1, 'recently sold item should be visible';
  assert (select count(*) from products) = 29, format('public should see 29, saw %s', (select count(*) from products));
end $$;
-- anon cannot sell
do $$ begin
  begin perform apply_inventory_change((select id from products where sku='FF-SWRLSL'), -1, 'barcode'); 
        raise exception 'anon sold an item';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 2. Logged-in non-staff cannot sell or edit stock directly.
set role authenticated; select set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-2222-2222-222222222222"}', false);
do $$ begin
  begin perform apply_inventory_change((select id from products where sku='FF-SWRLSL'), -1, 'barcode');
        raise exception 'non-staff sold an item';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 3. Staff sells via barcode: 3 -> 2, stays available. Direct quantity edit is blocked.
set role authenticated; select set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111"}', false);
do $$ declare e inventory_events; p products; begin
  e := apply_inventory_change((select id from products where sku='FF-SWRLSL'), -1, 'barcode');
  select * into p from products where sku='FF-SWRLSL';
  assert p.quantity = 2 and p.status = 'available', 'decrement failed';
  assert e.change = -1 and e.staff_user = '11111111-1111-1111-1111-111111111111', 'event not logged';
  begin update products set quantity = 99 where sku = 'FF-SWRLSL'; raise exception 'direct qty edit allowed';
  exception when insufficient_privilege then null; end;
  -- name edits are fine
  update products set name = 'Swirl Print Slip Dress' where sku = 'FF-SWRLSL';
end $$;

-- 4. Selling the last one-of-a-kind marks it sold with sold_at; selling again fails; undo restores.
do $$ declare e inventory_events; u inventory_events; p products; begin
  e := apply_inventory_change((select id from products where sku='FF-LV7DRS'), -1, 'photo_ai', 0.93);
  select * into p from products where sku='FF-LV7DRS';
  assert p.quantity = 0 and p.status = 'sold' and p.sold_at is not null, 'should be sold';
  begin perform apply_inventory_change(p.id, -1, 'barcode'); raise exception 'sold twice';
  exception when raise_exception then null; end;
  u := undo_inventory_event(e.id);
  select * into p from products where sku='FF-LV7DRS';
  assert p.quantity = 1 and p.status = 'available' and p.sold_at is null, 'undo failed';
  assert u.undoes_event_id = e.id, 'undo not linked';
  begin perform undo_inventory_event(e.id); raise exception 'undid twice';
  exception when raise_exception then null; end;
end $$;

-- 5. photo_ai requires confidence; one-of-a-kind cannot be restocked past 1; hide works.
do $$ declare pid uuid := (select id from products where sku='FF-MRGMXI'); begin
  begin perform apply_inventory_change(pid, -1, 'photo_ai'); raise exception 'ai without confidence';
  exception when check_violation then null; end;
  begin perform apply_inventory_change(pid, 2, 'manual'); raise exception 'ooak restock > 1';
  exception when raise_exception then null; end;
  perform apply_inventory_change(pid, 0, 'manual', null, 'Holding for photo shoot', 'hidden');
  assert (select status from products where id = pid) = 'hidden', 'hide failed';
end $$;

-- 6. Undo refuses if a later change happened.
do $$ declare e1 inventory_events; pid uuid := (select id from products where sku='FF-TDHLTR'); begin
  e1 := apply_inventory_change(pid, -1, 'barcode');
  perform apply_inventory_change(pid, -1, 'barcode');
  begin perform undo_inventory_event(e1.id); raise exception 'undo clobbered later sale';
  exception when raise_exception then null; end;
end $$;

-- 7. Service role (future POS webhook) can record a sale without a staff login.
reset role;
set role service_role; select set_config('request.jwt.claims', '{"role":"service_role"}', false);
do $$ begin
  perform apply_inventory_change((select id from products where sku='FF-HRTSHD'), -1, 'pos_webhook', null, 'Square order 123');
  assert (select quantity from products where sku='FF-HRTSHD') = 7, 'pos sale failed';
end $$;
reset role;

-- 8. Setting change: 7 days makes the 6-day-old sale visible again.
update store_settings set sold_visible_days = 7;
set role anon; select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  assert (select count(*) from products where sku = 'FF-PNKOVR') = 1, 'setting not respected';
  assert (select count(*) from products where sku = 'FF-MRGMXI') = 0, 'hidden item visible';
end $$;
reset role;
-- 9. Square link: a Square-origin sale via the service role, webhook log is service-only, variation ids are unique.
update products set square_variation_id = 'VAR-1' where sku = 'FF-CHRCRS';
do $$ begin
  begin update products set square_variation_id = 'VAR-1' where sku = 'FF-IRDMSH'; raise exception 'duplicate variation allowed';
  exception when unique_violation then null; end;
end $$;
set role authenticated; select set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111"}', false);
do $$ begin
  begin insert into square_webhook_events (event_id, type, payload) values ('x', 'y', '{}'); raise exception 'staff wrote webhook log';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role; select set_config('request.jwt.claims', '{"role":"service_role"}', false);
insert into square_webhook_events (event_id, type, payload) values ('evt-1', 'inventory.count.updated', '{}');
do $$ begin
  perform apply_inventory_change((select id from products where square_variation_id = 'VAR-1'), -1, 'pos_webhook', null, 'Sold on Square');
  assert (select quantity from products where sku = 'FF-CHRCRS') = 1, 'square sale failed';
end $$;
reset role;
select 'ALL DATABASE TESTS PASSED' as result;

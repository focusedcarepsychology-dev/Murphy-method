-- docs/DATABASE_SCHEMA.md §19 / docs/ARCHITECTURE.md §9.1: BodyScans —
-- body_scans, body_scan_images, plus the underlying Storage objects
-- (object-level access must be tested directly, not just the row).
--
-- CI correction (Phase 2A): against the real local Supabase stack, a
-- statement-level trigger on `storage.objects` rejects any direct SQL
-- DELETE ("Direct deletion from storage tables is not allowed. Use the
-- Storage API instead.") unless the session-local
-- `storage.allow_delete_query` setting is true — the Storage API sets this
-- flag itself before issuing its own DELETEs, precisely so an orphaned-file
-- bug can't slip in via a raw SQL DELETE. GitHub Actions run 30052333327,
-- job 89356840526 caught this: the two direct
-- `delete from storage.objects ...` statements below (added when this
-- suite was first written, before the flag's necessity was known) died on
-- the trigger before RLS was ever reached. The fix below sets the flag
-- immediately before each direct DELETE, exactly mirroring what the real
-- Storage API does, so what's actually exercised is the RLS ownership
-- policy underneath — not the orphan-file safety net, which is a
-- deliberately separate protection and is itself asserted directly (test
-- below).
select plan(18);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ insert into public.body_scans (profile_id, captured_on, purpose)
       values ('a0000000-0000-4000-8000-000000000001', current_date, 'baseline') $$,
    'User A can insert own body_scans row'
  );

  select is(
    (select count(*)::int from public.body_scans where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own body_scans'
  );

  select lives_ok(
    $$ insert into public.body_scan_images (body_scan_id, angle, storage_path)
       select id, 'front', 'a0000000-0000-4000-8000-000000000001/scan-1/front.jpg'
       from public.body_scans where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    'User A can insert own body_scan_images row'
  );

  select is(
    (select count(*)::int
     from public.body_scan_images bsi
     join public.body_scans bs on bs.id = bsi.body_scan_id
     where bs.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own body_scan_images via join policy'
  );

  select lives_ok(
    $$ insert into storage.objects (bucket_id, name, owner)
       values ('bodyscans', 'a0000000-0000-4000-8000-000000000001/scan-1/front.jpg', 'a0000000-0000-4000-8000-000000000001') $$,
    'User A can insert own bodyscans storage object'
  );

  select is(
    (select count(*)::int from storage.objects
     where bucket_id = 'bodyscans'
       and (storage.foldername(name))[1] = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own bodyscans storage object'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.body_scans where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s body_scans'
  );

  select is(
    (select count(*)::int
     from public.body_scan_images bsi
     join public.body_scans bs on bs.id = bsi.body_scan_id
     where bs.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s body_scan_images via join policy'
  );

  with deleted as (
    delete from public.body_scans where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from deleted), 0, 'User B''s DELETE targeting User A''s body_scans affects 0 rows');

  select is(
    (select count(*)::int from storage.objects
     where bucket_id = 'bodyscans'
       and (storage.foldername(name))[1] = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s bodyscans storage object'
  );

  set local storage.allow_delete_query = true;

  with deleted as (
    delete from storage.objects
      where bucket_id = 'bodyscans'
        and (storage.foldername(name))[1] = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from deleted), 0, 'User B''s DELETE targeting User A''s bodyscans storage object affects 0 rows');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  with deleted as (
    delete from public.body_scan_images
      where body_scan_id in (select id from public.body_scans where profile_id = 'a0000000-0000-4000-8000-000000000001')
      returning 1
  )
  select is((select count(*)::int from deleted), 1, 'User A can delete own body_scan_images');

  with deleted as (
    delete from public.body_scans where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from deleted), 1, 'User A can delete own body_scans');

  select throws_like(
    $$ delete from storage.objects
       where bucket_id = 'bodyscans'
         and (storage.foldername(name))[1] = 'a0000000-0000-4000-8000-000000000001' $$,
    '%Direct deletion from storage tables is not allowed%',
    'Direct DELETE from storage.objects without storage.allow_delete_query is rejected (orphan-file safety net, not RLS)'
  );

  set local storage.allow_delete_query = true;

  with deleted as (
    delete from storage.objects
      where bucket_id = 'bodyscans'
        and (storage.foldername(name))[1] = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from deleted), 1, 'User A can delete own bodyscans storage object');
commit;

begin;
  set local role anon;

  select throws_ok($$ select 1 from public.body_scans limit 1 $$, '42501', null, 'anon cannot select body_scans');
  select throws_ok($$ select 1 from public.body_scan_images limit 1 $$, '42501', null, 'anon cannot select body_scan_images');
  select is(
    (select count(*)::int from storage.objects where bucket_id = 'bodyscans'),
    0,
    'anon selecting bodyscans storage objects sees none (no matching policy for anon)'
  );
commit;

select * from finish();

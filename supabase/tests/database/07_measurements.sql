-- docs/DATABASE_SCHEMA.md §19: Measurements — body_measurements,
-- performance_metrics, personal_records.
select plan(15);

-- performance_metrics is written by server-side jobs only
-- (docs/DATABASE_SCHEMA.md §9) — seed as the unrestricted test-runner role,
-- matching how a real background job would write it (typically via the
-- service role).
insert into public.performance_metrics (profile_id, metric_type, period_start, period_end, value)
values ('a0000000-0000-4000-8000-000000000001', 'volume_trend', '2026-01-01', '2026-01-31', 1000);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ insert into public.body_measurements (profile_id, measured_on, metric, value)
       values ('a0000000-0000-4000-8000-000000000001', current_date, 'weight', 82.5) $$,
    'User A can insert own body_measurements row'
  );

  select is(
    (select count(*)::int from public.body_measurements where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own body_measurements'
  );

  with updated as (
    update public.body_measurements set value = 82.0
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 1, 'User A can update own body_measurements');

  select lives_ok(
    $$ insert into public.personal_records (profile_id, exercise_id, record_type, value, achieved_at)
       select 'a0000000-0000-4000-8000-000000000001', id, 'max_weight', 100, now()
       from public.exercises limit 1 $$,
    'User A can insert own personal_records row'
  );

  select is(
    (select count(*)::int from public.personal_records where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own personal_records'
  );

  select throws_ok(
    $$ update public.personal_records set value = 999
       where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    '42501',
    null,
    'User A cannot update personal_records (append-only, no update grant)'
  );

  select throws_ok(
    $$ insert into public.performance_metrics (profile_id, metric_type, period_start, period_end, value)
       values ('a0000000-0000-4000-8000-000000000001', 'volume_trend', current_date, current_date, 1) $$,
    '42501',
    null,
    'User A cannot insert performance_metrics (server-job-only, no insert grant)'
  );

  select is(
    (select count(*)::int from public.performance_metrics where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own (server-written) performance_metrics'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.body_measurements where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s body_measurements'
  );
  select is(
    (select count(*)::int from public.personal_records where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s personal_records'
  );
  select is(
    (select count(*)::int from public.performance_metrics where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s performance_metrics'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  with deleted as (
    delete from public.body_measurements where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from deleted), 1, 'User A can delete own body_measurements');
commit;

begin;
  set local role anon;
  select throws_ok($$ select 1 from public.body_measurements limit 1 $$, '42501', null, 'anon cannot select body_measurements');
  select throws_ok($$ select 1 from public.personal_records limit 1 $$, '42501', null, 'anon cannot select personal_records');
  select throws_ok($$ select 1 from public.performance_metrics limit 1 $$, '42501', null, 'anon cannot select performance_metrics');
commit;

select * from finish();

-- Programme regeneration preserves history and respects active workouts.
-- Uses fixture users created by 15_real_programme_engine.sql and workouts
-- created by 16_start_workout.sql; database tests run in filename order.
select plan(6);

create temporary table regeneration_before as
select
  p.id as programme_id,
  p.current_version_id,
  pv.version_number,
  (select count(*)::int from public.programme_versions all_versions where all_versions.programme_id = p.id) as version_count
from public.programmes p
join public.programme_versions pv on pv.id = p.current_version_id
where p.profile_id = '15000000-0000-4000-8000-000000000003';

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000003';

  select lives_ok(
    $$ select public.regenerate_current_programme() $$,
    'a user without an active workout can restructure their current programme'
  );
commit;

select is(
  (select count(*)::int from public.programme_versions pv
   where pv.programme_id = (select programme_id from regeneration_before)),
  (select version_count + 1 from regeneration_before),
  'regeneration creates exactly one new programme version'
);

select is(
  (select pv.version_number
   from public.programmes p
   join public.programme_versions pv on pv.id = p.current_version_id
   where p.id = (select programme_id from regeneration_before)),
  (select version_number + 1 from regeneration_before),
  'the new version becomes current with the next version number'
);

select is(
  (select pv.previous_version_id
   from public.programmes p
   join public.programme_versions pv on pv.id = p.current_version_id
   where p.id = (select programme_id from regeneration_before)),
  (select current_version_id from regeneration_before),
  'the new version points to the previous current version'
);

select ok(
  exists(
    select 1 from public.programme_versions
    where id = (select current_version_id from regeneration_before)
  ),
  'the previous programme version remains preserved in history'
);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  select throws_ok(
    $$ select public.regenerate_current_programme() $$,
    'P0001',
    'active_workout_in_progress',
    'programme regeneration is blocked while the caller has an active workout'
  );
commit;

select * from finish();

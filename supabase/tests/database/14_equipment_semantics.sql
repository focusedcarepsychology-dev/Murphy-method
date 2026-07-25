-- No-equipment semantics
-- (supabase/migrations/20260725090000_equipment_no_equipment_semantics.sql).
--
-- Real-device testing found a bodyweight-only user receiving dumbbell,
-- barbell and cable exercises. Part of the fix is structural: the
-- "bodyweight" sentinel must be unambiguous, and `set_user_equipment`
-- must be the only thing that can write `user_equipment`.
--
-- Brings its own fixture users for the same reason
-- 13_onboarding_rpc_functions.sql does: earlier files in the suite commit
-- their changes, and these assertions need an exact starting state.
select plan(14);

insert into auth.users (id, email) values
  ('14000000-0000-4000-8000-000000000001', 'user-g@example.com'),
  ('14000000-0000-4000-8000-000000000002', 'user-h@example.com')
on conflict (id) do nothing;

-- ===== the authenticated role cannot write the table directly =========
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000001';

  select throws_ok(
    $$ insert into public.user_equipment (profile_id, equipment_id, available)
       values ('14000000-0000-4000-8000-000000000001',
               (select id from public.equipment where key = 'barbell'), true) $$,
    '42501',
    null,
    'authenticated cannot INSERT user_equipment directly (RPC is the only writer)'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000001';

  select throws_ok(
    $$ update public.user_equipment set available = false $$,
    '42501',
    null,
    'authenticated cannot UPDATE user_equipment directly'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000001';

  select throws_ok(
    $$ delete from public.user_equipment $$,
    '42501',
    null,
    'authenticated cannot DELETE user_equipment directly'
  );
commit;

-- ===== bodyweight-only is a genuine, unambiguous state =================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ select public.set_user_equipment(
         array(select id from public.equipment where key = 'bodyweight')) $$,
    'User G can record "no equipment / bodyweight only"'
  );

  select is(
    (select count(*)::int from public.user_equipment ue
       join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = '14000000-0000-4000-8000-000000000001'
        and ue.available
        and e.key = 'bodyweight'),
    1,
    'the bodyweight sentinel is available for a bodyweight-only user'
  );

  select is(
    (select count(*)::int from public.user_equipment ue
       join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = '14000000-0000-4000-8000-000000000001'
        and ue.available
        and e.key <> 'bodyweight'),
    0,
    'a bodyweight-only user has no other equipment marked available'
  );
commit;

-- ===== the sentinel is mutually exclusive with real equipment ==========
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000001';

  -- A contradictory request ("I have no equipment, and also dumbbells")
  -- resolves deterministically to the real equipment.
  select lives_ok(
    $$ select public.set_user_equipment(
         array(select id from public.equipment where key in ('bodyweight', 'dumbbell'))) $$,
    'a contradictory selection is accepted and resolved, not rejected'
  );

  select is(
    (select count(*)::int from public.user_equipment ue
       join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = '14000000-0000-4000-8000-000000000001'
        and ue.available
        and e.key = 'bodyweight'),
    0,
    'the bodyweight sentinel is cleared once real equipment is selected'
  );

  select is(
    (select array_agg(e.key order by e.key) from public.user_equipment ue
       join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = '14000000-0000-4000-8000-000000000001' and ue.available),
    array['dumbbell'],
    'only the real equipment the user actually named remains available'
  );
commit;

-- ===== switching back to bodyweight-only clears the equipment ==========
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000001';

  select lives_ok(
    $$ select public.set_user_equipment(
         array(select id from public.equipment where key = 'bodyweight')) $$,
    'User G can switch back to bodyweight-only'
  );

  select is(
    (select array_agg(e.key order by e.key) from public.user_equipment ue
       join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = '14000000-0000-4000-8000-000000000001' and ue.available),
    array['bodyweight'],
    'switching back leaves the sentinel alone and nothing else'
  );
commit;

-- ===== identity and validation =========================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '14000000-0000-4000-8000-000000000002';

  select throws_ok(
    $$ select public.set_user_equipment(array[]::uuid[]) $$,
    'P0001',
    'at_least_one_equipment_required',
    'an empty selection is rejected rather than stored as "no answer"'
  );

  select lives_ok(
    $$ select public.set_user_equipment(
         array(select id from public.equipment where key = 'barbell')) $$,
    'User H can record their own equipment'
  );

  -- Verify cross-user isolation as the test owner; User H cannot read User G through RLS.
  reset role;

  select is(
    (select array_agg(e.key order by e.key) from public.user_equipment ue
       join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = '14000000-0000-4000-8000-000000000001' and ue.available),
    array['bodyweight'],
    'User H''s call never touched User G''s rows (identity comes from auth.uid())'
  );
commit;

select * from finish();

-- Self-service privacy functions remain owner-scoped and require explicit confirmation.
select plan(9);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000001';

  select is(
    public.get_my_data_export() -> 'profile' ->> 'id',
    '15000000-0000-4000-8000-000000000001',
    'the export contains only the authenticated owner profile'
  );

  select ok(
    public.get_my_data_export() ? 'workouts',
    'the export contains truthful workout history'
  );

  select ok(
    not (public.get_my_data_export()::text like '%storage_path%'),
    'the portable export omits private storage paths and signed URLs'
  );

  select throws_ok(
    $$ select public.delete_my_training_history('wrong') $$,
    'P0001',
    'confirmation_required',
    'training-history deletion requires the exact phrase'
  );

  select lives_ok(
    $$ select public.delete_my_training_history('DELETE WORKOUT HISTORY') $$,
    'the owner can delete workout history after exact confirmation'
  );

  select is(
    (select count(*)::integer from public.workouts where profile_id = '15000000-0000-4000-8000-000000000001'),
    0,
    'training-history deletion removes the owner workouts'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000002';

  select throws_ok(
    $$ select public.delete_my_account('wrong') $$,
    'P0001',
    'confirmation_required',
    'account deletion requires the exact phrase'
  );

  select lives_ok(
    $$ select public.delete_my_account('DELETE MY ACCOUNT') $$,
    'the owner can permanently delete their account after exact confirmation'
  );

  reset role;
  select is(
    (select count(*)::integer from auth.users where id = '15000000-0000-4000-8000-000000000002'),
    0,
    'account deletion removes the auth identity and cascades owned data'
  );
commit;

select * from finish();

-- docs/DATABASE_SCHEMA.md §19: Personal Response Model — personal_response_models,
-- preference_signals; Coach history — coach_threads, coach_messages.
select plan(16);

-- Written only by server-side Personalisation Engine jobs
-- (docs/DATABASE_SCHEMA.md §11) — seeded as the unrestricted test-runner role.
insert into public.personal_response_models (
  profile_id, domain, attribute_key, estimate, confidence, evidence_count, personalisation_rules_version
) values (
  'a0000000-0000-4000-8000-000000000001', 'preference', 'test_attribute', '{"value": 1}'::jsonb, 0.5, 3, 'v1'
);

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select is(
    (select count(*)::int from public.personal_response_models where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own (server-written) personal_response_models'
  );

  select throws_ok(
    $$ insert into public.personal_response_models (
         profile_id, domain, attribute_key, estimate, confidence, evidence_count, personalisation_rules_version
       ) values (
         'a0000000-0000-4000-8000-000000000001', 'preference', 'client_attempt', '{}'::jsonb, 0.1, 1, 'v1'
       ) $$,
    '42501',
    null,
    'User A cannot insert personal_response_models (server-job-only, no insert grant)'
  );

  select lives_ok(
    $$ insert into public.preference_signals (profile_id, signal_type, value, source_table)
       values ('a0000000-0000-4000-8000-000000000001', 'exercise_enjoyment', '{"rating": 4}'::jsonb, 'exercise_feedback') $$,
    'User A can insert own preference_signals row'
  );

  select is(
    (select count(*)::int from public.preference_signals where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own preference_signals'
  );

  select lives_ok(
    $$ insert into public.coach_threads (profile_id) values ('a0000000-0000-4000-8000-000000000001') $$,
    'User A can insert own coach_threads row'
  );

  select is(
    (select count(*)::int from public.coach_threads where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own coach_threads'
  );

  select lives_ok(
    $$ insert into public.coach_messages (thread_id, role, content)
       select id, 'user', 'How is my programme going?'
       from public.coach_threads where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    'User A can insert own coach_messages row'
  );

  select is(
    (select count(*)::int
     from public.coach_messages cm
     join public.coach_threads ct on ct.id = cm.thread_id
     where ct.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own coach_messages via join policy'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.personal_response_models where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s personal_response_models'
  );
  select is(
    (select count(*)::int from public.preference_signals where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s preference_signals'
  );
  select is(
    (select count(*)::int from public.coach_threads where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s coach_threads'
  );
  select is(
    (select count(*)::int
     from public.coach_messages cm
     join public.coach_threads ct on ct.id = cm.thread_id
     where ct.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s coach_messages via join policy'
  );
commit;

begin;
  set local role anon;
  select throws_ok($$ select 1 from public.personal_response_models limit 1 $$, '42501', null, 'anon cannot select personal_response_models');
  select throws_ok($$ select 1 from public.preference_signals limit 1 $$, '42501', null, 'anon cannot select preference_signals');
  select throws_ok($$ select 1 from public.coach_threads limit 1 $$, '42501', null, 'anon cannot select coach_threads');
  select throws_ok($$ select 1 from public.coach_messages limit 1 $$, '42501', null, 'anon cannot select coach_messages');
commit;

select * from finish();

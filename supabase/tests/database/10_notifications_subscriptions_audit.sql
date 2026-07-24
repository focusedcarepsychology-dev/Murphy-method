-- docs/DATABASE_SCHEMA.md §19: notification_preferences, notifications,
-- notification_responses, subscriptions, audit_logs.
select plan(21);

-- notifications/subscriptions are written by server-side jobs
-- (docs/DATABASE_SCHEMA.md §13-§14) — seeded as the unrestricted
-- test-runner role.
insert into public.notifications (profile_id, notification_type, payload, scheduled_for)
values ('a0000000-0000-4000-8000-000000000001', 'workout_reminder', '{}'::jsonb, now());

insert into public.subscriptions (profile_id)
values ('a0000000-0000-4000-8000-000000000001');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

  select is(
    (select count(*)::int from public.notification_preferences where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A has an auto-created notification_preferences row and can select it'
  );

  with updated as (
    update public.notification_preferences set workout_reminders_enabled = false
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
      returning 1
  )
  select is((select count(*)::int from updated), 1, 'User A can update own notification_preferences');

  select throws_ok(
    $$ insert into public.notification_preferences (profile_id) values ('a0000000-0000-4000-8000-000000000001') $$,
    '42501',
    null,
    'User A cannot insert notification_preferences directly (created only by the on_profile_created trigger)'
  );

  select is(
    (select count(*)::int from public.notifications where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own (server-written) notifications'
  );

  select throws_ok(
    $$ insert into public.notifications (profile_id, notification_type, payload, scheduled_for)
       values ('a0000000-0000-4000-8000-000000000001', 'progress', '{}'::jsonb, now()) $$,
    '42501',
    null,
    'User A cannot insert notifications (server-job-only, no insert grant)'
  );

  select lives_ok(
    $$ insert into public.notification_responses (notification_id, response_type)
       select id, 'opened' from public.notifications where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    'User A can insert a notification_responses row for own notification'
  );

  select is(
    (select count(*)::int
     from public.notification_responses nr
     join public.notifications n on n.id = nr.notification_id
     where n.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own notification_responses via join policy'
  );

  select is(
    (select count(*)::int from public.subscriptions where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own (server-written) subscriptions'
  );

  select lives_ok(
    $$ insert into public.audit_logs (profile_id, event_type, actor)
       values ('a0000000-0000-4000-8000-000000000001', 'data_export_requested', 'user') $$,
    'User A can insert own audit_logs row'
  );

  select is(
    (select count(*)::int from public.audit_logs where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    1,
    'User A can select own audit_logs'
  );

  select throws_ok(
    $$ update public.audit_logs set event_type = 'tampered'
       where profile_id = 'a0000000-0000-4000-8000-000000000001' $$,
    '42501',
    null,
    'User A cannot update audit_logs (immutable, no update grant)'
  );
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';

  select is(
    (select count(*)::int from public.notification_preferences where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s notification_preferences'
  );
  select is(
    (select count(*)::int from public.notifications where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s notifications'
  );
  select is(
    (select count(*)::int
     from public.notification_responses nr
     join public.notifications n on n.id = nr.notification_id
     where n.profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s notification_responses via join policy'
  );
  select is(
    (select count(*)::int from public.subscriptions where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s subscriptions'
  );
  select is(
    (select count(*)::int from public.audit_logs where profile_id = 'a0000000-0000-4000-8000-000000000001'),
    0,
    'User B cannot select User A''s audit_logs'
  );
commit;

begin;
  set local role anon;
  select throws_ok($$ select 1 from public.notification_preferences limit 1 $$, '42501', null, 'anon cannot select notification_preferences');
  select throws_ok($$ select 1 from public.notifications limit 1 $$, '42501', null, 'anon cannot select notifications');
  select throws_ok($$ select 1 from public.notification_responses limit 1 $$, '42501', null, 'anon cannot select notification_responses');
  select throws_ok($$ select 1 from public.subscriptions limit 1 $$, '42501', null, 'anon cannot select subscriptions');
  select throws_ok($$ select 1 from public.audit_logs limit 1 $$, '42501', null, 'anon cannot select audit_logs');
commit;

select * from finish();

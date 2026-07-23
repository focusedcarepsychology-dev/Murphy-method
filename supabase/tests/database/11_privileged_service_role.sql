-- docs/DATABASE_SCHEMA.md §19 "PRIVILEGED SERVER OPERATION": the service
-- role (used only inside Edge Functions, never present in the client)
-- bypasses RLS entirely and can perform the specific privileged operations
-- ordinary authenticated clients are denied above — asserted directly,
-- not assumed.
select plan(5);

begin;
  set local role service_role;

  select lives_ok(
    $$ insert into public.exercises (
         name, slug, movement_pattern_id, skill_requirement, difficulty, stability_requirement,
         loading_potential, fatigue_profile, recommended_rep_range_low, recommended_rep_range_high, source
       )
       select 'Service Role Test Exercise', 'rls-test-service-role-exercise', id, 'low', 'beginner', 'low',
              'moderate', 'moderate', 8, 12, 'internal_authoring'
       from public.movement_patterns where key = 'squat' $$,
    'service_role can write exercise content (content-pipeline privileged operation)'
  );

  select lives_ok(
    $$ insert into public.personal_response_models (
         profile_id, domain, attribute_key, estimate, confidence, evidence_count, personalisation_rules_version
       ) values (
         'a0000000-0000-4000-8000-000000000002', 'training', 'service_role_test_attribute', '{}'::jsonb, 0.5, 1, 'v1'
       ) $$,
    'service_role can write personal_response_models (Personalisation Engine privileged operation)'
  );

  select lives_ok(
    $$ insert into public.performance_metrics (profile_id, metric_type, period_start, period_end, value)
       values ('a0000000-0000-4000-8000-000000000002', 'estimated_1rm', current_date, current_date, 50) $$,
    'service_role can write performance_metrics (background-job privileged operation)'
  );

  select lives_ok(
    $$ insert into public.programmes (profile_id, status) values ('a0000000-0000-4000-8000-000000000002', 'active') $$,
    'service_role can write a programmes row on behalf of any profile'
  );

  select ok(
    (select count(*)::int from public.profiles) >= 2,
    'service_role bypasses RLS and can read across every user''s profiles row'
  );
commit;

select * from finish();

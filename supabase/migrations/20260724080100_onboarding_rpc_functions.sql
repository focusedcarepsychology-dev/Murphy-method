-- Phase 3 (Onboarding) trusted server-side operations.
--
-- Architecture note (full rationale in docs/DECISIONS.md): these three
-- operations are implemented as `security definer` Postgres functions
-- (the same pattern `handle_new_user()` already established in
-- supabase/migrations/20260723090200_profiles.sql), not Supabase Edge
-- Functions. All three are purely relational (validate inputs, derive
-- values deterministically, write rows) with no external I/O, no AI calls,
-- and no need for anything a general-purpose server runtime provides that
-- Postgres doesn't — so a Deno Edge Function would add a second runtime
-- for no architectural benefit here, and this development sandbox has no
-- Deno available to even exercise one (unlike these functions, which are
-- fully testable against the real local Postgres stack via pgTAP,
-- supabase/tests/database/13_onboarding_rpc_functions.sql). Each function
-- derives identity exclusively from `auth.uid()` — none accepts a
-- client-supplied profile id — and uses `set search_path = ''` with fully
-- qualified identifiers, matching this repository's existing
-- security-definer convention.

-- ---------------------------------------------------------------------
-- set_user_goal_priorities — atomic replace of the caller's active goal
-- set (docs/IMPLEMENTATION_PLAN.md Phase 3 §9). Deactivating the existing
-- active set before inserting the new one means the partial unique index
-- `user_goals_profile_priority_active_idx` (profile_id, priority) where
-- active can never transiently collide, and calling this twice with the
-- same input is a safe no-op on the resulting active set (old "new" rows
-- from the first call are themselves deactivated by the second call).
-- ---------------------------------------------------------------------
create or replace function public.set_user_goal_priorities(p_goal_keys text[])
returns setof public.user_goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_key_count integer;
  v_distinct_key_count integer;
  v_matching_goal_count integer;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_goal_keys is null or array_length(p_goal_keys, 1) is null then
    raise exception 'at_least_one_goal_required';
  end if;

  select count(*), count(distinct k) into v_key_count, v_distinct_key_count
  from unnest(p_goal_keys) as k;

  if v_key_count <> v_distinct_key_count then
    raise exception 'duplicate_goal_keys';
  end if;

  select count(*) into v_matching_goal_count
  from public.goals where key = any (p_goal_keys);

  if v_matching_goal_count <> v_key_count then
    raise exception 'unknown_goal_key';
  end if;

  update public.user_goals
  set active = false
  where profile_id = v_profile_id and active = true;

  insert into public.user_goals (profile_id, goal_id, priority, active)
  select v_profile_id, g.id, t.ordinality::smallint, true
  from unnest(p_goal_keys) with ordinality as t (key, ordinality)
  join public.goals g on g.key = t.key;

  return query
  select *
  from public.user_goals
  where profile_id = v_profile_id and active = true
  order by priority;
end;
$$;

comment on function public.set_user_goal_priorities(text[]) is
  'Atomically replaces the caller''s active user_goals with p_goal_keys, in order '
  '(index 0 = priority 1). security definer so the deactivate+insert pair runs as one '
  'statement pair inside the function''s implicit transaction, never violating the '
  'active-priority uniqueness constraint transiently.';

revoke all on function public.set_user_goal_priorities(text[]) from public, anon, authenticated;
grant execute on function public.set_user_goal_priorities(text[]) to authenticated;

-- ---------------------------------------------------------------------
-- submit_safety_screening — deterministic, versioned derivation of
-- requires_clearance/restriction_flags (docs/MASTER_SPEC.md §8.1,
-- docs/IMPLEMENTATION_PLAN.md Phase 3 §15). The authenticated client role
-- has no direct INSERT grant on health_screenings (see the revoke
-- migration alongside this one) — this function is the only writer.
-- Conservative routing: any "yes" answer sets requires_clearance true —
-- ordinary unsupervised training is not assumed safe by default for any
-- of these categories. No LLM, no network call, no diagnosis: this only
-- ever produces a restriction *code*, never a named medical condition.
--
-- DEVELOPMENT WORDING NOTICE: mirrors src/domain/onboarding/safety-screening.ts
-- — question wording and this disclaimer require qualified clinical/legal
-- review before public beta (docs/OPEN_QUESTIONS.md #5, docs/RISKS.md #1).
-- ---------------------------------------------------------------------
create or replace function public.submit_safety_screening(p_screening_version text, p_responses jsonb)
returns public.health_screenings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_requires_clearance boolean := false;
  v_restriction_flags text[] := '{}';
  v_row public.health_screenings;
  v_required_keys text[] := array[
    'heart_condition_supervised_only',
    'chest_pain_during_activity',
    'chest_pain_at_rest',
    'dizziness_or_balance_loss',
    'bone_or_joint_problem',
    'blood_pressure_or_heart_medication',
    'pregnant_or_recent_postpartum'
  ];
  v_key text;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_screening_version <> 'murphy-safety-v1' then
    raise exception 'unsupported_screening_version';
  end if;

  if p_responses is null or jsonb_typeof(p_responses) <> 'object' then
    raise exception 'incomplete_screening_responses';
  end if;

  foreach v_key in array v_required_keys loop
    if jsonb_typeof(p_responses -> v_key) is distinct from 'boolean' then
      raise exception 'incomplete_screening_responses';
    end if;
  end loop;

  if (p_responses ->> 'heart_condition_supervised_only')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'cardiac_supervision_required');
  end if;
  if (p_responses ->> 'chest_pain_during_activity')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'exertional_chest_pain');
  end if;
  if (p_responses ->> 'chest_pain_at_rest')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'rest_chest_pain');
  end if;
  if (p_responses ->> 'dizziness_or_balance_loss')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'dizziness_balance_risk');
  end if;
  if (p_responses ->> 'bone_or_joint_problem')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'joint_or_bone_limitation');
  end if;
  if (p_responses ->> 'blood_pressure_or_heart_medication')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'cardiac_bp_medication');
  end if;
  if (p_responses ->> 'pregnant_or_recent_postpartum')::boolean then
    v_requires_clearance := true;
    v_restriction_flags := array_append(v_restriction_flags, 'pregnancy_or_recent_postpartum');
  end if;

  insert into public.health_screenings
    (profile_id, responses, screening_version, requires_clearance, restriction_flags)
  values
    (v_profile_id, p_responses, p_screening_version, v_requires_clearance, v_restriction_flags)
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.submit_safety_screening(text, jsonb) is
  'Deterministic, versioned safety-screening rule derivation (docs/MASTER_SPEC.md §8.1). '
  'The client submits raw yes/no answers only — requires_clearance/restriction_flags are '
  'always derived here, never accepted from the caller.';

revoke all on function public.submit_safety_screening(text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_safety_screening(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- complete_onboarding — validates all required onboarding data exists,
-- creates the Phase 3 deterministic programme stand-in (docs/IMPLEMENTATION_PLAN.md
-- Phase 3 §21 — no fake exercises; Phase 4/5 replace this), and sets
-- profiles.onboarding_completed_at only on success. Idempotent: a profile
-- that is already complete returns its existing programme instead of
-- creating a second one.
-- ---------------------------------------------------------------------
create or replace function public.complete_onboarding()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_profile public.profiles;
  v_missing text[] := '{}';
  v_has_weight boolean;
  v_has_goals boolean;
  v_has_equipment boolean;
  v_screening public.health_screenings;
  v_goal_priorities jsonb;
  v_structure jsonb;
  v_summary text;
  v_programme_id uuid;
  v_version_id uuid;
  v_version_number integer := 1;
  v_existing_programme_id uuid;
  v_existing_version_id uuid;
  v_existing_structure jsonb;
  v_existing_version_number integer;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_profile_id;
  if not found then
    raise exception 'profile_not_found';
  end if;

  -- Idempotent repeat request: return the existing programme rather than
  -- re-validating/re-generating (docs/IMPLEMENTATION_PLAN.md Phase 3 §20).
  if v_profile.onboarding_completed_at is not null then
    select p.id, p.current_version_id into v_existing_programme_id, v_existing_version_id
    from public.programmes p
    where p.profile_id = v_profile_id
    order by p.created_at desc
    limit 1;

    if v_existing_programme_id is not null and v_existing_version_id is not null then
      select version_number, structure into v_existing_version_number, v_existing_structure
      from public.programme_versions
      where id = v_existing_version_id;

      return jsonb_build_object(
        'onboarding_completed_at', v_profile.onboarding_completed_at,
        'programme', jsonb_build_object(
          'id', v_existing_programme_id,
          'version_id', v_existing_version_id,
          'version_number', v_existing_version_number,
          'structure', v_existing_structure
        )
      );
    end if;
    -- Onboarding was marked complete but no programme exists (should not
    -- happen — defensive fallback) — fall through and generate one.
  end if;

  select exists(
    select 1 from public.body_measurements
    where profile_id = v_profile_id and metric = 'weight'
  ) into v_has_weight;

  select exists(
    select 1 from public.user_goals where profile_id = v_profile_id and active = true
  ) into v_has_goals;

  select exists(
    select 1 from public.user_equipment where profile_id = v_profile_id and available = true
  ) into v_has_equipment;

  if v_profile.date_of_birth is null then
    v_missing := array_append(v_missing, 'date_of_birth');
  elsif date_part('year', age(current_date, v_profile.date_of_birth)) < 18 then
    v_missing := array_append(v_missing, 'date_of_birth_ineligible');
  end if;
  if v_profile.height_cm is null then
    v_missing := array_append(v_missing, 'height_cm');
  end if;
  if not v_has_weight then
    v_missing := array_append(v_missing, 'weight');
  end if;
  if v_profile.training_experience is null then
    v_missing := array_append(v_missing, 'training_experience');
  end if;
  if v_profile.available_training_days is null or array_length(v_profile.available_training_days, 1) is null then
    v_missing := array_append(v_missing, 'available_training_days');
  end if;
  if v_profile.preferred_session_duration_minutes is null then
    v_missing := array_append(v_missing, 'preferred_session_duration_minutes');
  end if;
  if v_profile.coaching_style is null then
    v_missing := array_append(v_missing, 'coaching_style');
  end if;
  if not v_has_goals then
    v_missing := array_append(v_missing, 'goals');
  end if;
  if not v_has_equipment then
    v_missing := array_append(v_missing, 'equipment');
  end if;

  select * into v_screening
  from public.health_screenings
  where profile_id = v_profile_id
  order by created_at desc
  limit 1;

  if not found then
    v_missing := array_append(v_missing, 'safety_screening');
  end if;

  if array_length(v_missing, 1) is not null then
    raise exception using
      message = 'incomplete_onboarding',
      detail = to_jsonb(v_missing)::text;
  end if;

  select jsonb_agg(
    jsonb_build_object('goalKey', g.key, 'label', g.label, 'priority', ug.priority)
    order by ug.priority
  )
  into v_goal_priorities
  from public.user_goals ug
  join public.goals g on g.id = ug.goal_id
  where ug.profile_id = v_profile_id and ug.active = true;

  v_summary := case
    when v_screening.requires_clearance then
      'Your starting structure is ready. Based on your safety screening, we recommend ' ||
      'confirming with a qualified professional before beginning certain training content. ' ||
      'Exercise selection will be finalised once that''s confirmed.'
    else
      'Your starting structure is ready. Exercise selection will be built from your goals, ' ||
      'equipment, and safety information.'
  end;

  v_structure := jsonb_build_object(
    'standInVersion', 'phase3-stub-1',
    'weeklyFrequencyDays', to_jsonb(v_profile.available_training_days),
    'sessionDurationMinutes', v_profile.preferred_session_duration_minutes,
    'requiresClearance', v_screening.requires_clearance,
    'restrictionFlags', to_jsonb(v_screening.restriction_flags),
    'goalPriorities', coalesce(v_goal_priorities, '[]'::jsonb),
    'summary', v_summary
  );

  insert into public.programmes (profile_id, status)
  values (v_profile_id, 'active')
  returning id into v_programme_id;

  insert into public.programme_versions (
    programme_id, version_number, structure, change_level, change_reason,
    engine_version, exercise_dataset_version
  )
  values (
    v_programme_id, v_version_number, v_structure, 0,
    'Initial programme created from your onboarding responses.',
    'phase3-stub-1', '0'
  )
  returning id into v_version_id;

  update public.programmes
  set current_version_id = v_version_id
  where id = v_programme_id;

  update public.profiles
  set onboarding_completed_at = now()
  where id = v_profile_id
  returning onboarding_completed_at into v_profile.onboarding_completed_at;

  return jsonb_build_object(
    'onboarding_completed_at', v_profile.onboarding_completed_at,
    'programme', jsonb_build_object(
      'id', v_programme_id,
      'version_id', v_version_id,
      'version_number', v_version_number,
      'structure', v_structure
    )
  );
end;
$$;

comment on function public.complete_onboarding() is
  'Validates all required Phase 3 onboarding data for the caller (never a client-supplied '
  'profile id), creates the deterministic Phase 3 programme stand-in, and sets '
  'profiles.onboarding_completed_at only on success. Idempotent on repeat calls.';

revoke all on function public.complete_onboarding() from public, anon, authenticated;
grant execute on function public.complete_onboarding() to authenticated;

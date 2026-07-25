-- Real-device remediation Part 8/9: the minimum deterministic initial
-- programme engine v1 (docs/PROGRAMME_ENGINE.md is the future full
-- engine's spec; this is deliberately a smaller, real, testable slice of
-- it, not that full pipeline). Zero LLM calls. Server-authoritative: the
-- client never chooses exercises, it only ever receives what this
-- function decided.
--
-- `build_real_programme_structure` is intentionally NOT granted to
-- `authenticated` — it is an internal helper called only by
-- `complete_onboarding` (new users) and `upgrade_programme_to_real_v1`
-- (existing phase3-stub-1 users), both of which are the public,
-- auth.uid()-scoped entry points.

create or replace function public.build_real_programme_structure(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_screening public.health_screenings;
  v_goal_priorities jsonb;
  v_primary_goal_label text;
  v_equipment_keys text[];
  v_is_bodyweight_only boolean;
  v_boosted_muscle_keys text[];
  v_frequency integer;
  v_split_type text;
  v_pattern_slots text[];
  v_exercise_count_target integer;
  v_sessions jsonb := '[]'::jsonb;
  v_limitation_notes text[] := '{}';
  v_session_index integer;
  v_pattern text;
  v_order_index integer;
  v_session_exercises jsonb;
  v_picked record;
  v_used_in_session uuid[];
  v_why text;
  v_session_label text;
  v_session_focus text;
  v_rotate integer;
begin
  select * into v_profile from public.profiles where id = p_profile_id;

  select array_agg(eq.key) into v_equipment_keys
  from public.user_equipment ue
  join public.equipment eq on eq.id = ue.equipment_id
  where ue.profile_id = p_profile_id and ue.available;
  v_equipment_keys := coalesce(v_equipment_keys, '{}');
  v_is_bodyweight_only := v_equipment_keys = array['bodyweight'];
  -- Every user has their own body regardless of what other equipment they
  -- selected: 'bodyweight' is the always-available baseline, not a piece
  -- of gear someone without it lacks. Without this, a user who selected
  -- only gym equipment (and, correctly per Part 5, therefore does not have
  -- 'bodyweight' in user_equipment) would wrongly be ineligible for every
  -- bodyweight-only exercise (lunges, calf raises, core work).
  if not ('bodyweight' = any(v_equipment_keys)) then
    v_equipment_keys := array_append(v_equipment_keys, 'bodyweight');
  end if;

  select * into v_screening
  from public.health_screenings
  where profile_id = p_profile_id
  order by created_at desc
  limit 1;

  select jsonb_agg(
    jsonb_build_object('goalKey', g.key, 'label', g.label, 'priority', ug.priority)
    order by ug.priority
  )
  into v_goal_priorities
  from public.user_goals ug
  join public.goals g on g.id = ug.goal_id
  where ug.profile_id = p_profile_id and ug.active = true;

  select g.label into v_primary_goal_label
  from public.user_goals ug
  join public.goals g on g.id = ug.goal_id
  where ug.profile_id = p_profile_id and ug.active = true
  order by ug.priority
  limit 1;

  -- Body-area emphasis (docs/PROGRAMME_ENGINE.md §2 "body-area goal
  -- contributes to muscle development scoring only" — never a fat-loss
  -- selection input, applied as a same-difficulty tie-break bonus below).
  select array_agg(distinct m.key) into v_boosted_muscle_keys
  from public.body_area_goals bag
  join public.body_area_muscle_map bam on bam.body_area_key = bag.body_area_key and bam.weight >= 0.3
  join public.muscles m on m.id = bam.muscle_id
  where bag.profile_id = p_profile_id and bag.active = true;
  v_boosted_muscle_keys := coalesce(v_boosted_muscle_keys, '{}');

  v_frequency := greatest(1, least(7, coalesce(array_length(v_profile.available_training_days, 1), 1)));
  v_split_type := case when v_frequency <= 3 then 'full_body' else 'upper_lower' end;
  v_exercise_count_target := greatest(
    4, least(8, round(coalesce(v_profile.preferred_session_duration_minutes, 30) / 6.0))
  );

  for v_session_index in 0 .. v_frequency - 1 loop
    if v_split_type = 'full_body' then
      v_pattern_slots := array[
        'squat', 'hip_hinge', 'horizontal_push', 'horizontal_pull', 'vertical_push',
        'vertical_pull', 'lunge_single_leg', 'core_anti_extension', 'core_anti_rotation',
        'calf', 'hip_extension', 'conditioning'
      ];
      v_session_label := 'Full Body ' || chr(65 + (v_session_index % 3));
      v_session_focus := 'Full-body training covering your main movement patterns.';
    elsif v_session_index % 2 = 0 then
      v_pattern_slots := array[
        'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
        'core_anti_extension', 'core_anti_rotation'
      ];
      v_session_label := 'Upper Body ' || chr(65 + (v_session_index / 2));
      v_session_focus := 'Upper-body pushing and pulling.';
    else
      v_pattern_slots := array[
        'squat', 'hip_hinge', 'lunge_single_leg', 'hip_extension', 'calf', 'core_anti_rotation'
      ];
      v_session_label := 'Lower Body ' || chr(65 + (v_session_index / 2));
      v_session_focus := 'Lower-body squat and hinge patterns.';
    end if;

    -- Rotate which pattern gets priority per session so a multi-day-a-week
    -- programme doesn't repeat the identical exercise selection every
    -- session (still fully deterministic, and every pattern in the slot
    -- list is still covered when the eligible pool allows it).
    v_rotate := (v_session_index * 3) % array_length(v_pattern_slots, 1);
    if v_rotate > 0 then
      v_pattern_slots := v_pattern_slots[v_rotate + 1:array_length(v_pattern_slots, 1)]
        || v_pattern_slots[1:v_rotate];
    end if;

    v_session_exercises := '[]'::jsonb;
    v_used_in_session := '{}';
    v_order_index := 0;

    foreach v_pattern in array v_pattern_slots loop
      exit when v_order_index >= v_exercise_count_target;

      -- EQUIPMENT HARD FILTER: excluded whenever any required equipment
      -- link points to a key the user doesn't have available.
      -- SAFETY HARD FILTER: excluded whenever an `exclude`-effect
      -- restriction matches one of the user's restriction_flags.
      -- EXPERIENCE FILTER: difficulty ceiling by training_experience.
      select
        e.id, e.name, e.recommended_rep_range_low, e.recommended_rep_range_high,
        mp.label as pattern_label,
        exists (
          select 1 from public.exercise_muscles em
          where em.exercise_id = e.id and em.role = 'primary'
            and em.muscle_id in (select id from public.muscles where key = any(v_boosted_muscle_keys))
        ) as boosted
      into v_picked
      from public.exercises e
      join public.movement_patterns mp on mp.id = e.movement_pattern_id
      where mp.key = v_pattern
        and e.active and e.review_status = 'published'
        and e.id <> all(v_used_in_session)
        and not exists (
          select 1 from public.exercise_restrictions er
          where er.exercise_id = e.id and er.effect = 'exclude'
            and er.restriction_code = any(coalesce(v_screening.restriction_flags, '{}'))
        )
        and not exists (
          select 1 from public.exercise_equipment ee
          join public.equipment eq on eq.id = ee.equipment_id
          where ee.exercise_id = e.id and ee.required and not (eq.key = any(v_equipment_keys))
        )
        and (
          (v_profile.training_experience = 'beginner' and e.difficulty = 'beginner')
          or (v_profile.training_experience = 'recreational' and e.difficulty in ('beginner', 'intermediate'))
          or (v_profile.training_experience = 'intermediate' and e.difficulty in ('beginner', 'intermediate', 'advanced'))
          or (v_profile.training_experience is null and e.difficulty = 'beginner')
        )
      order by
        boosted desc,
        (case e.difficulty when 'beginner' then 0 when 'intermediate' then 1 else 2 end) asc,
        e.name asc
      limit 1;

      if v_picked.id is null then
        continue;
      end if;

      v_used_in_session := array_append(v_used_in_session, v_picked.id);

      v_why := 'Trains your ' || lower(v_picked.pattern_label) || ' pattern';
      if v_primary_goal_label is not null then
        v_why := v_why || ', supporting your goal to ' || lower(v_primary_goal_label) || '.';
      else
        v_why := v_why || '.';
      end if;
      if v_picked.boosted then
        v_why := v_why || ' It also works one of the body areas you asked to focus on.';
      end if;
      if v_is_bodyweight_only then
        v_why := v_why || ' Selected because it needs no equipment.';
      end if;

      v_session_exercises := v_session_exercises || jsonb_build_object(
        'exerciseId', v_picked.id,
        'orderIndex', v_order_index,
        'targetSets', 3,
        'targetRepRangeLow', v_picked.recommended_rep_range_low,
        'targetRepRangeHigh', v_picked.recommended_rep_range_high,
        'movementPattern', v_pattern,
        'whyIncluded', v_why
      );
      v_order_index := v_order_index + 1;
    end loop;

    -- HONEST LIMITATIONS: a session with zero eligible exercises is
    -- surfaced, never silently dropped or backfilled with an ineligible pick.
    if v_order_index = 0 then
      v_limitation_notes := array_append(
        v_limitation_notes,
        'No eligible exercise was available for ' || v_session_label ||
        ' with your current equipment, experience or safety settings.'
      );
    end if;

    v_sessions := v_sessions || jsonb_build_object(
      'sessionIndex', v_session_index,
      'label', v_session_label,
      'focusSummary', v_session_focus,
      'exercises', v_session_exercises
    );
  end loop;

  if v_is_bodyweight_only then
    v_limitation_notes := array_append(
      v_limitation_notes,
      'No pulling exercise is included because a real back-strengthening pull needs ' ||
      'at least a resistance band, a pull-up bar, or a cable/lat-pulldown machine. ' ||
      'Everything else in your programme uses only your body weight.'
    );
  end if;

  return jsonb_build_object(
    'engineVersion', 'deterministic-v1',
    'splitType', v_split_type,
    'weeklyFrequencyDays', to_jsonb(v_profile.available_training_days),
    'sessionDurationMinutes', v_profile.preferred_session_duration_minutes,
    'requiresClearance', coalesce(v_screening.requires_clearance, false),
    'restrictionFlags', to_jsonb(coalesce(v_screening.restriction_flags, '{}'::text[])),
    'goalPriorities', coalesce(v_goal_priorities, '[]'::jsonb),
    'limitationNotes', to_jsonb(v_limitation_notes),
    'sessions', v_sessions,
    'summary', 'Your programme is built from your goals, equipment, availability and safety settings.'
  );
end;
$$;

comment on function public.build_real_programme_structure(uuid) is
  'Deterministic initial-programme engine v1 (remediation Part 8): equipment hard filter, '
  'safety hard filter, experience filter, goal/body-area emphasis. Internal only — call '
  'through complete_onboarding or upgrade_programme_to_real_v1, never directly.';

revoke all on function public.build_real_programme_structure(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- complete_onboarding — replaces the Phase 3 structure stub with a real
-- generated exercise programme for every NEWLY completing user, using the
-- engine above. Signature/idempotency behaviour is unchanged from
-- 20260724080100_onboarding_rpc_functions.sql.
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
  v_structure jsonb;
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

  v_structure := public.build_real_programme_structure(v_profile_id);

  insert into public.programmes (profile_id, status)
  values (v_profile_id, 'active')
  returning id into v_programme_id;

  insert into public.programme_versions (
    programme_id, version_number, structure, change_level, change_reason,
    engine_version, exercise_dataset_version
  )
  values (
    v_programme_id, v_version_number, v_structure, 0,
    'Initial exercise programme generated using your goals, equipment, availability and safety settings.',
    'deterministic-v1', '1'
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
  'Validates all required Phase 3 onboarding data for the caller, generates a real initial '
  'exercise programme via build_real_programme_structure, and sets '
  'profiles.onboarding_completed_at only on success. Idempotent on repeat calls.';

revoke all on function public.complete_onboarding() from public, anon, authenticated;
grant execute on function public.complete_onboarding() to authenticated;

-- ---------------------------------------------------------------------
-- upgrade_programme_to_real_v1 — the safe upgrade path for users who
-- already completed onboarding under the old phase3-stub-1 structure
-- (remediation Part 9). Preserves the stub version as history; creates a
-- new version using the real engine. Idempotent: calling it again once
-- already upgraded returns the existing version rather than creating a
-- duplicate.
-- ---------------------------------------------------------------------
create or replace function public.upgrade_programme_to_real_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_programme_id uuid;
  v_current_version_id uuid;
  v_current_engine_version text;
  v_current_version_number integer;
  v_structure jsonb;
  v_new_version_id uuid;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  select p.id, p.current_version_id into v_programme_id, v_current_version_id
  from public.programmes p
  where p.profile_id = v_profile_id
  order by p.created_at desc
  limit 1;

  if v_programme_id is null then
    raise exception 'no_programme_to_upgrade';
  end if;

  select engine_version, version_number into v_current_engine_version, v_current_version_number
  from public.programme_versions
  where id = v_current_version_id;

  if v_current_engine_version = 'deterministic-v1' then
    return jsonb_build_object(
      'programmeId', v_programme_id,
      'versionId', v_current_version_id,
      'versionNumber', v_current_version_number,
      'upgraded', false
    );
  end if;

  v_structure := public.build_real_programme_structure(v_profile_id);

  insert into public.programme_versions (
    programme_id, previous_version_id, version_number, structure, change_level, change_reason,
    engine_version, exercise_dataset_version
  )
  values (
    v_programme_id, v_current_version_id, v_current_version_number + 1, v_structure, 1,
    'Initial exercise programme generated using your goals, equipment, availability and safety ' ||
    'settings. Your original starting structure is preserved in your programme history.',
    'deterministic-v1', '1'
  )
  returning id into v_new_version_id;

  update public.programmes
  set current_version_id = v_new_version_id
  where id = v_programme_id;

  return jsonb_build_object(
    'programmeId', v_programme_id,
    'versionId', v_new_version_id,
    'versionNumber', v_current_version_number + 1,
    'upgraded', true
  );
end;
$$;

comment on function public.upgrade_programme_to_real_v1() is
  'Idempotent upgrade path (remediation Part 9) from the Phase 3 phase3-stub-1 structure '
  'stub to a real deterministic-v1 exercise programme. A no-op (upgraded: false) once the '
  'caller''s current version already uses the real engine.';

revoke all on function public.upgrade_programme_to_real_v1() from public, anon, authenticated;
grant execute on function public.upgrade_programme_to_real_v1() to authenticated;

-- Real-device remediation Part 10/11: materialises a real workouts/
-- workout_exercises row set from a programme_versions session, replacing
-- the client's previous PREVIEW_WORKOUT_ID routing. FULL/QUICK/MINIMUM are
-- derived from the same real session data, not hard-coded minute values —
-- sets are reduced before exercises are dropped, per
-- docs/PROGRAMME_ENGINE.md §10's "breadth over depth" principle, and the
-- estimated duration is computed from what was actually kept, never a
-- fixed number.
create or replace function public.start_workout(
  p_programme_version_id uuid,
  p_session_index integer,
  p_mode text,
  p_client_generated_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_structure jsonb;
  v_session jsonb;
  v_exercises jsonb;
  v_n integer;
  v_keep_count integer;
  v_set_delta integer;
  v_workout_id uuid;
  v_existing_workout_id uuid;
  v_order_index integer;
  v_ex jsonb;
  v_sets integer;
  v_total_minutes numeric := 0;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_mode not in ('full', 'quick', 'minimum') then
    raise exception 'invalid_mode';
  end if;
  if p_client_generated_id is null then
    raise exception 'client_generated_id_required';
  end if;

  -- Idempotent: replaying the same client_generated_id (offline retry,
  -- double-tap) returns the existing workout instead of creating a
  -- duplicate (docs/ARCHITECTURE.md §5).
  select id into v_existing_workout_id
  from public.workouts
  where client_generated_id = p_client_generated_id;

  if v_existing_workout_id is not null then
    return jsonb_build_object('workoutId', v_existing_workout_id, 'created', false);
  end if;

  select pv.structure into v_structure
  from public.programme_versions pv
  join public.programmes p on p.id = pv.programme_id
  where pv.id = p_programme_version_id and p.profile_id = v_profile_id;

  if v_structure is null then
    raise exception 'programme_version_not_found';
  end if;

  select s into v_session
  from jsonb_array_elements(v_structure -> 'sessions') s
  where (s ->> 'sessionIndex')::int = p_session_index;

  if v_session is null then
    raise exception 'session_not_found';
  end if;

  v_exercises := coalesce(v_session -> 'exercises', '[]'::jsonb);
  v_n := jsonb_array_length(v_exercises);

  if v_n = 0 then
    raise exception 'session_has_no_exercises';
  end if;

  if p_mode = 'full' then
    v_keep_count := v_n;
    v_set_delta := 0;
  elsif p_mode = 'quick' then
    v_keep_count := greatest(1, ceil(v_n * 0.6)::int);
    v_set_delta := -1;
  else
    v_keep_count := greatest(1, ceil(v_n * 0.34)::int);
    v_set_delta := -2;
  end if;

  insert into public.workouts (
    profile_id, programme_version_id, mode, status, scheduled_for, started_at,
    client_generated_id
  )
  values (
    v_profile_id, p_programme_version_id, p_mode, 'in_progress', current_date, now(),
    p_client_generated_id
  )
  returning id into v_workout_id;

  for v_order_index in 0 .. v_keep_count - 1 loop
    v_ex := v_exercises -> v_order_index;
    v_sets := greatest(1, coalesce((v_ex ->> 'targetSets')::int, 3) + v_set_delta);
    v_total_minutes := v_total_minutes + (v_sets * 3);

    insert into public.workout_exercises (
      workout_id, exercise_id, order_index, target_sets, target_rep_range_low,
      target_rep_range_high, client_generated_id
    )
    values (
      v_workout_id, (v_ex ->> 'exerciseId')::uuid, v_order_index, v_sets,
      (v_ex ->> 'targetRepRangeLow')::int, (v_ex ->> 'targetRepRangeHigh')::int,
      gen_random_uuid()
    );
  end loop;

  update public.workouts
  set estimated_duration_minutes = round(v_total_minutes)::int
  where id = v_workout_id;

  return jsonb_build_object('workoutId', v_workout_id, 'created', true);
end;
$$;

comment on function public.start_workout(uuid, integer, text, uuid) is
  'Materialises a real workouts/workout_exercises row set from a programme_versions '
  'session (remediation Part 10/11). FULL keeps every exercise at its full prescribed '
  'sets; QUICK/MINIMUM reduce sets first, then drop lowest-priority exercises, per '
  'docs/PROGRAMME_ENGINE.md §10. Idempotent on p_client_generated_id.';

revoke all on function public.start_workout(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.start_workout(uuid, integer, text, uuid) to authenticated;

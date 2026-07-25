-- Creates a new deterministic programme version from the caller's current
-- goals, equipment, availability and latest safety screening. The previous
-- version remains immutable history. Regeneration is blocked while a workout
-- is in progress so an active session cannot silently diverge from its plan.
create or replace function public.regenerate_current_programme()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_programme_id uuid;
  v_current_version_id uuid;
  v_current_version_number integer;
  v_structure jsonb;
  v_new_version_id uuid;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  if exists (
    select 1
    from public.workouts
    where profile_id = v_profile_id and status = 'in_progress'
  ) then
    raise exception 'active_workout_in_progress';
  end if;

  select p.id, p.current_version_id
  into v_programme_id, v_current_version_id
  from public.programmes p
  where p.profile_id = v_profile_id and p.status = 'active'
  order by p.created_at desc
  limit 1
  for update;

  if v_programme_id is null or v_current_version_id is null then
    raise exception 'no_programme_to_regenerate';
  end if;

  select pv.version_number
  into v_current_version_number
  from public.programme_versions pv
  where pv.id = v_current_version_id and pv.programme_id = v_programme_id;

  if v_current_version_number is null then
    raise exception 'current_programme_version_not_found';
  end if;

  v_structure := public.build_real_programme_structure(v_profile_id);

  insert into public.programme_versions (
    programme_id,
    previous_version_id,
    version_number,
    structure,
    change_level,
    change_reason,
    engine_version,
    exercise_dataset_version
  )
  values (
    v_programme_id,
    v_current_version_id,
    v_current_version_number + 1,
    v_structure,
    4,
    'Programme restructured from your current goals, equipment, availability and safety settings. The previous version remains in your history.',
    'deterministic-v1',
    '1'
  )
  returning id into v_new_version_id;

  update public.programmes
  set current_version_id = v_new_version_id,
      updated_at = now()
  where id = v_programme_id and profile_id = v_profile_id;

  return jsonb_build_object(
    'programmeId', v_programme_id,
    'versionId', v_new_version_id,
    'versionNumber', v_current_version_number + 1,
    'previousVersionId', v_current_version_id,
    'regenerated', true
  );
end;
$$;

comment on function public.regenerate_current_programme() is
  'Creates a new deterministic programme version for the authenticated owner while preserving the previous version. Refuses to run during an in-progress workout.';

revoke all on function public.regenerate_current_programme() from public, anon, authenticated;
grant execute on function public.regenerate_current_programme() to authenticated;

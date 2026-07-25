-- Self-service privacy controls. Exports are owner-scoped JSON and destructive
-- actions require explicit phrases. BodyScan objects continue to be deleted
-- through the storage-aware client repository before their database rows.

create or replace function public.get_my_data_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return jsonb_build_object(
    'exportedAt', now(),
    'profile', (
      select to_jsonb(p) from public.profiles p where p.id = v_user_id
    ),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', g.key,
        'label', g.label,
        'priority', ug.priority,
        'active', ug.active
      ) order by ug.priority)
      from public.user_goals ug
      join public.goals g on g.id = ug.goal_id
      where ug.profile_id = v_user_id
    ), '[]'::jsonb),
    'bodyAreaGoals', coalesce((
      select jsonb_agg(to_jsonb(bag) order by bag.priority nulls last)
      from public.body_area_goals bag
      where bag.profile_id = v_user_id
    ), '[]'::jsonb),
    'equipment', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', e.key,
        'label', e.label,
        'available', ue.available
      ) order by e.label)
      from public.user_equipment ue
      join public.equipment e on e.id = ue.equipment_id
      where ue.profile_id = v_user_id
    ), '[]'::jsonb),
    'safetyScreenings', coalesce((
      select jsonb_agg(to_jsonb(hs) order by hs.created_at desc)
      from public.health_screenings hs
      where hs.profile_id = v_user_id
    ), '[]'::jsonb),
    'consentHistory', coalesce((
      select jsonb_agg(to_jsonb(cr) order by cr.created_at desc)
      from public.consent_records cr
      where cr.profile_id = v_user_id
    ), '[]'::jsonb),
    'measurements', coalesce((
      select jsonb_agg(to_jsonb(bm) order by bm.measured_on desc)
      from public.body_measurements bm
      where bm.profile_id = v_user_id
    ), '[]'::jsonb),
    'programmes', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc)
      from public.programmes p
      where p.profile_id = v_user_id
    ), '[]'::jsonb),
    'programmeVersions', coalesce((
      select jsonb_agg(to_jsonb(pv) order by pv.created_at desc)
      from public.programme_versions pv
      join public.programmes p on p.id = pv.programme_id
      where p.profile_id = v_user_id
    ), '[]'::jsonb),
    'workouts', coalesce((
      select jsonb_agg(
        to_jsonb(w) || jsonb_build_object(
          'exercises', coalesce((
            select jsonb_agg(
              to_jsonb(we) || jsonb_build_object(
                'exerciseName', e.name,
                'setLogs', coalesce((
                  select jsonb_agg(to_jsonb(sl) order by sl.set_number)
                  from public.set_logs sl
                  where sl.workout_exercise_id = we.id
                ), '[]'::jsonb)
              ) order by we.order_index
            )
            from public.workout_exercises we
            join public.exercises e on e.id = we.exercise_id
            where we.workout_id = w.id
          ), '[]'::jsonb)
        ) order by w.created_at desc
      )
      from public.workouts w
      where w.profile_id = v_user_id
    ), '[]'::jsonb),
    'bodyScanMetadata', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bs.id,
        'capturedOn', bs.captured_on,
        'purpose', bs.purpose,
        'createdAt', bs.created_at,
        'angles', coalesce((
          select jsonb_agg(bsi.angle order by bsi.angle)
          from public.body_scan_images bsi
          where bsi.body_scan_id = bs.id
        ), '[]'::jsonb)
      ) order by bs.captured_on desc)
      from public.body_scans bs
      where bs.profile_id = v_user_id
    ), '[]'::jsonb),
    'notifications', (
      select to_jsonb(np)
      from public.notification_preferences np
      where np.profile_id = v_user_id
    ),
    'momentum', jsonb_build_object(
      'profile', (
        select to_jsonb(gp) from public.gamification_profiles gp where gp.profile_id = v_user_id
      ),
      'pointEvents', coalesce((
        select jsonb_agg(to_jsonb(gpe) order by gpe.created_at desc)
        from public.gamification_point_events gpe
        where gpe.profile_id = v_user_id
      ), '[]'::jsonb),
      'achievements', coalesce((
        select jsonb_agg(to_jsonb(gua) order by gua.achieved_at desc)
        from public.gamification_user_achievements gua
        where gua.profile_id = v_user_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.delete_my_training_history(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workouts_deleted integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_confirmation is distinct from 'DELETE WORKOUT HISTORY' then
    raise exception 'confirmation_required';
  end if;

  select count(*)::integer into v_workouts_deleted
  from public.workouts where profile_id = v_user_id;

  delete from public.workouts where profile_id = v_user_id;
  delete from public.gamification_point_events where profile_id = v_user_id;
  delete from public.gamification_user_achievements where profile_id = v_user_id;

  return jsonb_build_object('workoutsDeleted', v_workouts_deleted);
end;
$$;

create or replace function public.delete_my_account(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_confirmation is distinct from 'DELETE MY ACCOUNT' then
    raise exception 'confirmation_required';
  end if;

  delete from auth.users where id = v_user_id;
  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function public.get_my_data_export() from public, anon;
revoke all on function public.delete_my_training_history(text) from public, anon;
revoke all on function public.delete_my_account(text) from public, anon;

grant execute on function public.get_my_data_export() to authenticated;
grant execute on function public.delete_my_training_history(text) to authenticated;
grant execute on function public.delete_my_account(text) to authenticated;

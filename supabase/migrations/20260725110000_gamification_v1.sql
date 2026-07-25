-- Ethical gamification v1: consistency-based Momentum Points, private achievements,
-- and an opt-in monthly leaderboard. Competitive scoring never uses body weight,
-- body measurements, lifted load, repetitions beyond the prescription, or paid status.

create table public.gamification_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  public_alias text,
  leaderboard_opt_in boolean not null default false,
  celebration_effects boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamification_alias_valid check (
    public_alias is null
    or (
      char_length(btrim(public_alias)) between 3 and 24
      and btrim(public_alias) ~ '^[[:alnum:]][[:alnum:] _-]{2,23}$'
    )
  ),
  constraint gamification_alias_required_for_leaderboard check (
    not leaderboard_opt_in or public_alias is not null
  )
);

create unique index gamification_profiles_alias_unique_idx
  on public.gamification_profiles (lower(btrim(public_alias)))
  where public_alias is not null;

create trigger set_gamification_profiles_updated_at
  before update on public.gamification_profiles
  for each row execute function public.set_updated_at();

create table public.gamification_point_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('daily_completion', 'weekly_target')),
  points integer not null check (points between 1 and 500),
  period_start date not null,
  source_workout_id uuid references public.workouts (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (profile_id, event_type, period_start)
);

create index gamification_points_profile_created_idx
  on public.gamification_point_events (profile_id, created_at desc);

create table public.gamification_achievements (
  key text primary key,
  label text not null,
  description text not null,
  icon_key text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

insert into public.gamification_achievements (key, label, description, icon_key, sort_order)
values
  ('first_session', 'First step', 'Complete your first fully logged session.', 'flag', 10),
  ('three_sessions', 'Building momentum', 'Complete a session on three different days.', 'bolt', 20),
  ('ten_sessions', 'Consistent ten', 'Complete a session on ten different days.', 'checkCircle', 30),
  ('fifty_sessions', 'Fifty strong', 'Complete a session on fifty different days.', 'trophy', 40),
  ('minimum_counts', 'Minimum counts', 'Complete a minimum-mode session when time or energy is limited.', 'star', 50),
  ('weekly_target', 'Week completed', 'Meet your planned session target within one week.', 'verified', 60)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order;

create table public.gamification_user_achievements (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  achievement_key text not null references public.gamification_achievements (key),
  achieved_at timestamptz not null default now(),
  source_workout_id uuid references public.workouts (id) on delete set null,
  progress_snapshot jsonb not null default '{}'::jsonb,
  primary key (profile_id, achievement_key)
);

create table public.gamification_seasons (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

create table public.gamification_entries (
  season_id uuid not null references public.gamification_seasons (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (season_id, profile_id)
);

alter table public.gamification_profiles enable row level security;
alter table public.gamification_point_events enable row level security;
alter table public.gamification_achievements enable row level security;
alter table public.gamification_user_achievements enable row level security;
alter table public.gamification_seasons enable row level security;
alter table public.gamification_entries enable row level security;

create policy "gamification_profiles: owner select"
  on public.gamification_profiles for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "gamification_point_events: owner select"
  on public.gamification_point_events for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "gamification_achievements: authenticated select"
  on public.gamification_achievements for select to authenticated
  using (true);

create policy "gamification_user_achievements: owner select"
  on public.gamification_user_achievements for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "gamification_seasons: authenticated select"
  on public.gamification_seasons for select to authenticated
  using (true);

create policy "gamification_entries: owner select"
  on public.gamification_entries for select to authenticated
  using (profile_id = (select auth.uid()));

grant select on table public.gamification_profiles to authenticated;
grant select on table public.gamification_point_events to authenticated;
grant select on table public.gamification_achievements to authenticated;
grant select on table public.gamification_user_achievements to authenticated;
grant select on table public.gamification_seasons to authenticated;
grant select on table public.gamification_entries to authenticated;

-- Tournament integrity: clients start workouts through the audited RPC and
-- cannot create arbitrary workout prescriptions solely to farm points.
revoke insert on table public.workouts from authenticated;
revoke insert, update on table public.workout_exercises from authenticated;

create or replace function public.ensure_current_gamification_season()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start date := date_trunc('month', current_date)::date;
  v_end date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_key text := to_char(current_date, 'YYYY-MM');
  v_id uuid;
begin
  insert into public.gamification_seasons (key, name, starts_on, ends_on)
  values (
    v_key,
    trim(to_char(current_date, 'FMMonth YYYY')) || ' Momentum Cup',
    v_start,
    v_end
  )
  on conflict (key) do update set
    name = excluded.name,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.ensure_current_gamification_season() from public, anon, authenticated;

create or replace function public.reconcile_workout_gamification(p_workout_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workout public.workouts%rowtype;
  v_expected_sets integer;
  v_logged_sets integer;
  v_event_date date;
  v_week_start date;
  v_points integer;
  v_scored_days integer;
  v_week_days integer;
  v_week_target integer;
begin
  select * into v_workout
  from public.workouts
  where id = p_workout_id;

  if not found or v_workout.status <> 'completed' then
    return;
  end if;

  select coalesce(sum(target_sets), 0)::integer
  into v_expected_sets
  from public.workout_exercises
  where workout_id = p_workout_id;

  select count(*)::integer
  into v_logged_sets
  from (
    select distinct sl.workout_exercise_id, sl.set_number
    from public.set_logs sl
    join public.workout_exercises we on we.id = sl.workout_exercise_id
    where we.workout_id = p_workout_id
      and sl.set_number between 1 and we.target_sets
  ) completed_sets;

  if v_expected_sets <= 0 or v_logged_sets < v_expected_sets then
    return;
  end if;

  v_event_date := (coalesce(v_workout.completed_at, now()) at time zone 'UTC')::date;
  v_week_start := date_trunc('week', v_event_date::timestamp)::date;
  v_points := case v_workout.mode
    when 'full' then 100
    when 'quick' then 75
    else 50
  end;

  select greatest(1, least(7, coalesce(cardinality(available_training_days), 1)))
  into v_week_target
  from public.profiles
  where id = v_workout.profile_id;

  insert into public.gamification_point_events (
    profile_id,
    event_type,
    points,
    period_start,
    source_workout_id,
    metadata
  ) values (
    v_workout.profile_id,
    'daily_completion',
    v_points,
    v_event_date,
    p_workout_id,
    jsonb_build_object(
      'mode', v_workout.mode,
      'targetDays', v_week_target,
      'scoringRule', 'highest-completed-mode-per-utc-day'
    )
  )
  on conflict (profile_id, event_type, period_start) do update set
    points = greatest(public.gamification_point_events.points, excluded.points),
    source_workout_id = case
      when excluded.points > public.gamification_point_events.points then excluded.source_workout_id
      else public.gamification_point_events.source_workout_id
    end,
    metadata = case
      when excluded.points > public.gamification_point_events.points then
        jsonb_set(
          excluded.metadata,
          '{targetDays}',
          coalesce(
            public.gamification_point_events.metadata -> 'targetDays',
            excluded.metadata -> 'targetDays'
          ),
          true
        )
      else public.gamification_point_events.metadata
    end;

  -- Lock the week's target to the first scored day. Later profile edits cannot
  -- lower or raise the requirement for a week already in progress.
  select coalesce(
    case
      when (metadata ->> 'targetDays') ~ '^[1-7]$' then (metadata ->> 'targetDays')::integer
      else null
    end,
    v_week_target
  )
  into v_week_target
  from public.gamification_point_events
  where profile_id = v_workout.profile_id
    and event_type = 'daily_completion'
    and period_start >= v_week_start
    and period_start < v_week_start + 7
  order by period_start
  limit 1;

  select count(*)::integer
  into v_scored_days
  from public.gamification_point_events
  where profile_id = v_workout.profile_id
    and event_type = 'daily_completion';

  if v_scored_days >= 1 then
    insert into public.gamification_user_achievements (
      profile_id, achievement_key, source_workout_id, progress_snapshot
    ) values (
      v_workout.profile_id, 'first_session', p_workout_id, jsonb_build_object('scoredDays', v_scored_days)
    ) on conflict do nothing;
  end if;

  if v_scored_days >= 3 then
    insert into public.gamification_user_achievements (
      profile_id, achievement_key, source_workout_id, progress_snapshot
    ) values (
      v_workout.profile_id, 'three_sessions', p_workout_id, jsonb_build_object('scoredDays', v_scored_days)
    ) on conflict do nothing;
  end if;

  if v_scored_days >= 10 then
    insert into public.gamification_user_achievements (
      profile_id, achievement_key, source_workout_id, progress_snapshot
    ) values (
      v_workout.profile_id, 'ten_sessions', p_workout_id, jsonb_build_object('scoredDays', v_scored_days)
    ) on conflict do nothing;
  end if;

  if v_scored_days >= 50 then
    insert into public.gamification_user_achievements (
      profile_id, achievement_key, source_workout_id, progress_snapshot
    ) values (
      v_workout.profile_id, 'fifty_sessions', p_workout_id, jsonb_build_object('scoredDays', v_scored_days)
    ) on conflict do nothing;
  end if;

  if v_workout.mode = 'minimum' then
    insert into public.gamification_user_achievements (
      profile_id, achievement_key, source_workout_id, progress_snapshot
    ) values (
      v_workout.profile_id, 'minimum_counts', p_workout_id, jsonb_build_object('mode', 'minimum')
    ) on conflict do nothing;
  end if;

  select count(*)::integer
  into v_week_days
  from public.gamification_point_events
  where profile_id = v_workout.profile_id
    and event_type = 'daily_completion'
    and period_start >= v_week_start
    and period_start < v_week_start + 7;

  if v_week_days >= v_week_target then
    insert into public.gamification_point_events (
      profile_id, event_type, points, period_start, source_workout_id, metadata
    ) values (
      v_workout.profile_id,
      'weekly_target',
      75,
      v_week_start,
      p_workout_id,
      jsonb_build_object('completedDays', v_week_days, 'targetDays', v_week_target)
    ) on conflict do nothing;

    insert into public.gamification_user_achievements (
      profile_id, achievement_key, source_workout_id, progress_snapshot
    ) values (
      v_workout.profile_id,
      'weekly_target',
      p_workout_id,
      jsonb_build_object('completedDays', v_week_days, 'targetDays', v_week_target)
    ) on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.reconcile_workout_gamification(uuid) from public, anon, authenticated;

create or replace function public.gamification_on_workout_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    perform public.reconcile_workout_gamification(new.id);
  end if;
  return new;
end;
$$;

create trigger gamification_after_workout_completed
  after update of status on public.workouts
  for each row execute function public.gamification_on_workout_completed();

create or replace function public.gamification_on_set_log_saved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workout_id uuid;
begin
  select workout_id into v_workout_id
  from public.workout_exercises
  where id = new.workout_exercise_id;

  if v_workout_id is not null then
    perform public.reconcile_workout_gamification(v_workout_id);
  end if;
  return new;
end;
$$;

create trigger gamification_after_set_log_saved
  after insert or update on public.set_logs
  for each row execute function public.gamification_on_set_log_saved();

create or replace function public.gamification_raw_points_for_period(
  p_profile_id uuid,
  p_starts_on date,
  p_ends_on date
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(points), 0)::integer
  from public.gamification_point_events
  where profile_id = p_profile_id
    and period_start >= p_starts_on
    and period_start < p_ends_on;
$$;

revoke all on function public.gamification_raw_points_for_period(uuid, date, date)
  from public, anon, authenticated;

-- Cup scoring is normalised to the member's weekly plan so a one-, three- or
-- five-day plan has the same maximum competitive score. The target is locked
-- to the value stored on the first scored day of that week, preventing later
-- profile changes from rewriting a completed week's competition rules.
create or replace function public.gamification_score_for_period(
  p_profile_id uuid,
  p_starts_on date,
  p_ends_on date
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with daily_events as (
    select
      pe.period_start,
      date_trunc('week', pe.period_start::timestamp)::date as week_start,
      greatest(
        1,
        least(
          7,
          coalesce(
            case
              when (pe.metadata ->> 'targetDays') ~ '^[1-7]$'
                then (pe.metadata ->> 'targetDays')::integer
              else null
            end,
            1
          )
        )
      ) as target_days
    from public.gamification_point_events pe
    where pe.profile_id = p_profile_id
      and pe.event_type = 'daily_completion'
      and pe.period_start >= p_starts_on
      and pe.period_start < p_ends_on
  ), first_targets as (
    select distinct on (week_start)
      week_start,
      target_days
    from daily_events
    order by week_start, period_start
  ), weekly_counts as (
    select week_start, count(*)::integer as completed_days
    from daily_events
    group by week_start
  ), weekly_scores as (
    select round(
      300.0 * least(w.completed_days, t.target_days)::numeric / t.target_days
    )::integer as points
    from weekly_counts w
    join first_targets t using (week_start)
  ), bonus as (
    select coalesce(sum(pe.points), 0)::integer as points
    from public.gamification_point_events pe
    where pe.profile_id = p_profile_id
      and pe.event_type = 'weekly_target'
      and pe.period_start >= p_starts_on
      and pe.period_start < p_ends_on
  )
  select coalesce((select sum(points) from weekly_scores), 0)::integer
    + (select points from bonus);
$$;

revoke all on function public.gamification_score_for_period(uuid, date, date)
  from public, anon, authenticated;

create or replace function public.get_gamification_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season_id uuid;
  v_profile public.gamification_profiles%rowtype;
  v_season public.gamification_seasons%rowtype;
  v_lifetime_points integer;
  v_season_points integer;
  v_rank integer;
  v_participants integer;
  v_achievements jsonb;
  v_scored_days integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.gamification_profiles (profile_id)
  values (v_user_id)
  on conflict (profile_id) do nothing;

  select * into v_profile
  from public.gamification_profiles
  where profile_id = v_user_id;

  v_season_id := public.ensure_current_gamification_season();
  select * into v_season from public.gamification_seasons where id = v_season_id;

  select count(*) filter (where event_type = 'daily_completion')::integer
  into v_scored_days
  from public.gamification_point_events
  where profile_id = v_user_id;

  v_lifetime_points := public.gamification_raw_points_for_period(
    v_user_id,
    date '2000-01-01',
    date '2100-01-01'
  );
  v_season_points := public.gamification_score_for_period(
    v_user_id,
    v_season.starts_on,
    v_season.ends_on
  );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', a.key,
      'label', a.label,
      'description', a.description,
      'iconKey', a.icon_key,
      'achievedAt', ua.achieved_at
    ) order by a.sort_order
  ), '[]'::jsonb)
  into v_achievements
  from public.gamification_achievements a
  left join public.gamification_user_achievements ua
    on ua.achievement_key = a.key
   and ua.profile_id = v_user_id;

  if v_profile.leaderboard_opt_in then
    with scores as (
      select
        e.profile_id,
        public.gamification_score_for_period(
          e.profile_id,
          v_season.starts_on,
          v_season.ends_on
        ) as points,
        (
          select count(*)::integer
          from public.gamification_point_events pe
          where pe.profile_id = e.profile_id
            and pe.event_type = 'daily_completion'
            and pe.period_start >= v_season.starts_on
            and pe.period_start < v_season.ends_on
        ) as scored_days,
        e.joined_at
      from public.gamification_entries e
      join public.gamification_profiles gp
        on gp.profile_id = e.profile_id and gp.leaderboard_opt_in
      where e.season_id = v_season_id
    ), ranked as (
      select profile_id, dense_rank() over (order by points desc) as position
      from scores
    )
    select position::integer into v_rank from ranked where profile_id = v_user_id;

    select count(*)::integer into v_participants
    from public.gamification_entries e
    join public.gamification_profiles gp
      on gp.profile_id = e.profile_id and gp.leaderboard_opt_in
    where e.season_id = v_season_id;
  else
    v_rank := null;
    v_participants := null;
  end if;

  return jsonb_build_object(
    'enabled', true,
    'leaderboardOptIn', v_profile.leaderboard_opt_in,
    'publicAlias', v_profile.public_alias,
    'celebrationEffects', v_profile.celebration_effects,
    'lifetimePoints', coalesce(v_lifetime_points, 0),
    'scoredDays', coalesce(v_scored_days, 0),
    'season', jsonb_build_object(
      'id', v_season.id,
      'name', v_season.name,
      'startsOn', v_season.starts_on,
      'endsOn', v_season.ends_on,
      'points', coalesce(v_season_points, 0),
      'rank', v_rank,
      'participants', v_participants
    ),
    'achievements', v_achievements
  );
end;
$$;

create or replace function public.set_gamification_preferences(
  p_public_alias text,
  p_leaderboard_opt_in boolean,
  p_celebration_effects boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_alias text := nullif(btrim(p_public_alias), '');
  v_season_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_leaderboard_opt_in and (
    v_alias is null
    or char_length(v_alias) not between 3 and 24
    or v_alias !~ '^[[:alnum:]][[:alnum:] _-]{2,23}$'
  ) then
    raise exception 'leaderboard_alias_required';
  end if;

  if v_alias is not null and exists (
    select 1 from public.gamification_profiles
    where lower(btrim(public_alias)) = lower(v_alias)
      and profile_id <> v_user_id
  ) then
    raise exception 'leaderboard_alias_taken';
  end if;

  insert into public.gamification_profiles (
    profile_id, public_alias, leaderboard_opt_in, celebration_effects
  ) values (
    v_user_id, v_alias, p_leaderboard_opt_in, p_celebration_effects
  )
  on conflict (profile_id) do update set
    public_alias = excluded.public_alias,
    leaderboard_opt_in = excluded.leaderboard_opt_in,
    celebration_effects = excluded.celebration_effects;

  v_season_id := public.ensure_current_gamification_season();
  if p_leaderboard_opt_in then
    insert into public.gamification_entries (season_id, profile_id)
    values (v_season_id, v_user_id)
    on conflict do nothing;
  else
    delete from public.gamification_entries
    where season_id = v_season_id and profile_id = v_user_id;
  end if;

  return public.get_gamification_dashboard();
end;
$$;

create or replace function public.get_gamification_leaderboard(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season_id uuid;
  v_season public.gamification_seasons%rowtype;
  v_entries jsonb;
  v_current jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_season_id := public.ensure_current_gamification_season();
  select * into v_season from public.gamification_seasons where id = v_season_id;

  with scores as (
    select
      e.profile_id,
      gp.public_alias,
      public.gamification_score_for_period(
        e.profile_id,
        v_season.starts_on,
        v_season.ends_on
      ) as points,
      (
        select count(*)::integer
        from public.gamification_point_events pe
        where pe.profile_id = e.profile_id
          and pe.event_type = 'daily_completion'
          and pe.period_start >= v_season.starts_on
          and pe.period_start < v_season.ends_on
      ) as scored_days,
      e.joined_at
    from public.gamification_entries e
    join public.gamification_profiles gp
      on gp.profile_id = e.profile_id
     and gp.leaderboard_opt_in
     and gp.public_alias is not null
    where e.season_id = v_season_id
  ), ranked as (
    select
      profile_id,
      public_alias,
      points,
      scored_days,
      dense_rank() over (order by points desc) as position
    from scores
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', position,
    'alias', public_alias,
    'points', points,
    'scoredDays', scored_days,
    'isCurrentUser', profile_id = v_user_id
  ) order by position), '[]'::jsonb)
  into v_entries
  from (select * from ranked where position <= greatest(1, least(coalesce(p_limit, 50), 100))) limited;

  with scores as (
    select
      e.profile_id,
      gp.public_alias,
      public.gamification_score_for_period(
        e.profile_id,
        v_season.starts_on,
        v_season.ends_on
      ) as points,
      (
        select count(*)::integer
        from public.gamification_point_events pe
        where pe.profile_id = e.profile_id
          and pe.event_type = 'daily_completion'
          and pe.period_start >= v_season.starts_on
          and pe.period_start < v_season.ends_on
      ) as scored_days,
      e.joined_at
    from public.gamification_entries e
    join public.gamification_profiles gp
      on gp.profile_id = e.profile_id
     and gp.leaderboard_opt_in
     and gp.public_alias is not null
    where e.season_id = v_season_id
  ), ranked as (
    select
      profile_id,
      public_alias,
      points,
      scored_days,
      dense_rank() over (order by points desc) as position
    from scores
  )
  select jsonb_build_object(
    'rank', position,
    'alias', public_alias,
    'points', points,
    'scoredDays', scored_days,
    'isCurrentUser', true
  ) into v_current
  from ranked
  where profile_id = v_user_id;

  return jsonb_build_object(
    'season', jsonb_build_object(
      'id', v_season.id,
      'name', v_season.name,
      'startsOn', v_season.starts_on,
      'endsOn', v_season.ends_on
    ),
    'entries', v_entries,
    'currentUser', v_current,
    'rules', jsonb_build_object(
      'fullSessionPoints', 100,
      'quickSessionPoints', 75,
      'minimumSessionPoints', 50,
      'weeklyTargetBonus', 75,
      'dailyCap', 'one completed day; extra sessions and sets do not add Cup score',
      'weeklyCupMaximum', 300,
      'weeklyNormalisation', 'up to 300 points for meeting your own weekly plan, plus the target bonus'
    )
  );
end;
$$;

revoke all on function public.get_gamification_dashboard() from public, anon;
revoke all on function public.set_gamification_preferences(text, boolean, boolean) from public, anon;
revoke all on function public.get_gamification_leaderboard(integer) from public, anon;

grant execute on function public.get_gamification_dashboard() to authenticated;
grant execute on function public.set_gamification_preferences(text, boolean, boolean) to authenticated;
grant execute on function public.get_gamification_leaderboard(integer) to authenticated;

-- No-equipment semantics (real-device remediation, Part 5).
--
-- Real-device testing found a user who selected "no equipment /
-- bodyweight only" during onboarding being shown dumbbell, barbell and
-- cable exercises. The selection itself was persisted correctly, but
-- nothing in the schema made the sentinel *unambiguous*: `user_equipment`
-- happily held `bodyweight` and `barbell` as simultaneously available,
-- and the client was the only thing deciding otherwise.
--
-- This migration makes the rule structural:
--
--  1. existing ambiguous rows are normalised (real equipment wins — a
--     user who has a barbell is not a bodyweight-only user);
--  2. `set_user_equipment` becomes the only writer of `user_equipment`,
--     applying the mutual-exclusion rule atomically inside one function
--     call so a two-statement client update can never leave an
--     intermediate ambiguous state visible;
--  3. the authenticated role loses direct INSERT/UPDATE/DELETE on the
--     table, matching how `health_screenings` is already protected.
--
-- SELECT is deliberately unchanged: reading your own equipment is a plain
-- owner-scoped read and does not need a function.

-- 1. Normalise pre-existing ambiguous selections ---------------------------
--
-- Only touches rows that are genuinely contradictory (the sentinel marked
-- available alongside at least one real equipment row). Rows are marked
-- unavailable rather than deleted, consistent with how the table has
-- always been maintained (docs/DATABASE_SCHEMA.md §3).
update public.user_equipment ue
set available = false
from public.equipment e
where ue.equipment_id = e.id
  and e.key = 'bodyweight'
  and ue.available = true
  and exists (
    select 1
    from public.user_equipment other
    join public.equipment other_equipment on other_equipment.id = other.equipment_id
    where other.profile_id = ue.profile_id
      and other.available = true
      and other_equipment.key <> 'bodyweight'
  );

-- 2. The single writer -----------------------------------------------------
create or replace function public.set_user_equipment(p_equipment_ids uuid[])
returns setof public.user_equipment
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_requested uuid[];
  v_known_count integer;
  v_real_equipment_count integer;
begin
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_equipment_ids is null or array_length(p_equipment_ids, 1) is null then
    raise exception 'at_least_one_equipment_required';
  end if;

  select array_agg(distinct id) into v_requested from unnest(p_equipment_ids) as id;

  select count(*) into v_known_count
  from public.equipment where id = any (v_requested);

  if v_known_count <> array_length(v_requested, 1) then
    raise exception 'unknown_equipment_id';
  end if;

  -- Mutual exclusion: "bodyweight" means *no equipment at all*, so it is
  -- dropped the moment any real equipment is also selected. This is a
  -- deterministic resolution of a contradictory request, not a silent
  -- rejection of the user's answer: the equipment they named is kept.
  select count(*) into v_real_equipment_count
  from public.equipment
  where id = any (v_requested) and key <> 'bodyweight';

  if v_real_equipment_count > 0 then
    select array_agg(e.id) into v_requested
    from public.equipment e
    where e.id = any (v_requested) and e.key <> 'bodyweight';
  end if;

  insert into public.user_equipment (profile_id, equipment_id, available)
  select v_profile_id, id, true
  from unnest(v_requested) as id
  on conflict (profile_id, equipment_id)
  do update set available = true;

  update public.user_equipment
  set available = false
  where profile_id = v_profile_id
    and not (equipment_id = any (v_requested))
    and available = true;

  return query
  select *
  from public.user_equipment
  where profile_id = v_profile_id and available = true;
end;
$$;

comment on function public.set_user_equipment(uuid[]) is
  'Sole writer of user_equipment. Replaces the caller''s available set atomically and '
  'enforces the no-equipment sentinel''s mutual exclusivity: selecting "bodyweight" '
  'alongside real equipment resolves to the real equipment, so "bodyweight only" always '
  'means genuinely no equipment. Identity comes from auth.uid(), never from the caller.';

revoke all on function public.set_user_equipment(uuid[]) from public, anon, authenticated;
grant execute on function public.set_user_equipment(uuid[]) to authenticated;

-- 3. Remove the direct client write path -----------------------------------
revoke insert, update, delete on table public.user_equipment from authenticated;

drop policy if exists "user_equipment: owner insert" on public.user_equipment;
drop policy if exists "user_equipment: owner update" on public.user_equipment;
drop policy if exists "user_equipment: owner delete" on public.user_equipment;

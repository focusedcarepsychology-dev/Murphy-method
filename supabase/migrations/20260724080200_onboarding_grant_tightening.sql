-- Phase 3 (Onboarding) correction: two tables' existing table-level GRANTs
-- are broader than the trust boundary this phase actually needs, now that
-- real write paths exist for both.
--
-- 1. profiles.onboarding_completed_at must only ever be set by
--    complete_onboarding() (docs/IMPLEMENTATION_PLAN.md Phase 3 §20 — "Do
--    not accept an arbitrary profileId... do not let client code simply
--    `update profiles set onboarding_completed_at = now()`"). The existing
--    table-level `grant update on table public.profiles to authenticated`
--    (supabase/migrations/20260724070000_revoke_authenticated_default_table_grants.sql)
--    lets a client update *any* column including this one — GRANT is
--    additive, so it must be revoked and re-granted per-column rather than
--    narrowed by only editing RLS (RLS policies don't distinguish columns).
--    Every other client-editable profile field keeps ordinary UPDATE
--    access; this is the sole column removed.
--
-- 2. health_screenings.requires_clearance/restriction_flags must only ever
--    be derived by submit_safety_screening() (docs/MASTER_SPEC.md §8.1 —
--    "client must NOT directly choose requires_clearance/restriction_flags").
--    The existing `grant select, insert on table public.health_screenings
--    to authenticated` lets a client INSERT a row directly with any values
--    for those two columns, which the RLS policy (profile_id = auth.uid())
--    does not prevent — only a security-definer function can now write
--    this table, so the INSERT grant is revoked entirely (SELECT is kept,
--    the client still reads its own screening history).
revoke update on table public.profiles from authenticated;
grant update (
  display_name, date_of_birth, biological_sex, height_cm, unit_preference,
  training_experience, available_training_days, preferred_session_duration_minutes,
  coaching_style, timezone
) on table public.profiles to authenticated;

revoke insert on table public.health_screenings from authenticated;

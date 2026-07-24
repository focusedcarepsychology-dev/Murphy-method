# Phase 2B — Hosted Project Verification Plan

Status: this is the test plan to execute **once** a real hosted development
Supabase project exists and `.github/workflows/deploy-supabase-dev.yml` has
been run against it (`docs/PHASE_2B_HOSTED_SETUP.md`). Nothing in this
document has been executed yet — do not report any item below as passing
until it has actually been run against the real project. This distinction
matters: `docs/SUPABASE_SETUP.md` and `docs/DECISIONS.md`'s Phase 2A/2A
correction-pass entries record exactly what was and wasn't verified where,
and this document continues that discipline for Phase 2B.

## 1. Automated: schema/migration verification

Already built and repository-tested against a from-scratch migrated schema
(see `docs/DECISIONS.md`'s Phase 2B correction-pass entry) — runs
automatically as part of `deploy-supabase-dev.yml`, as a single command:

- `supabase test db --linked` — the full pgTAP suite in
  `supabase/tests/database/` (13 files, 241 assertions — the RLS Test
  Matrix from `docs/SUPABASE_SETUP.md` §5, plus
  `12_hosted_structural_verification.sql`'s structural checks: all 44
  tables present with RLS enabled, no unreviewed extra tables, required
  functions exist, `service_role` has table privileges, no `anon` grant
  exists on any private table, the `bodyscans` bucket exists and is
  private), run against the real hosted project instead of the local/CI
  stack.

An earlier version of this deploy workflow ran a second, separate check
(`scripts/verify-hosted-schema.sql`) over a hand-built direct Postgres
connection string. That was removed — GitHub Actions runners lack the
IPv6 egress that hostname resolves to by default, so the check was not
reliably runnable there, and duplicating the same assertions in two
places (one pgTAP, one hand-rolled SQL) risked the two drifting apart.
The structural checks now live as pgTAP assertions in
`supabase/tests/database/12_hosted_structural_verification.sql`, so there
is exactly one implementation, exercised by both `supabase test db
--local` (CI, every PR) and `supabase test db --linked` (this workflow) —
see `docs/DECISIONS.md`.

This must pass before treating the hosted schema as verified. It does not
replace `.github/workflows/ci.yml`'s `database` job, which keeps running
on every PR regardless of whether a hosted project exists.

## 2. Manual: hosted authentication lifecycle

Perform each of these against the real hosted development project (i.e.
with `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
pointed at it — `docs/PHASE_2B_HOSTED_SETUP.md` §G), using the running app
(a dev build or Expo Go), not `curl`/Postman, so the test matches what a
real user experiences.

### Sign up

- [ ] Create a new account with a real, reachable test email address and a
      password meeting the 8-character minimum.
- [ ] Confirm a verification email arrives at that address (via the
      project's configured email provider — Supabase's own sandbox sender
      for a brand-new project, or a configured SMTP provider).
- [ ] Confirm a `profiles` row was created for the new user (Supabase
      Studio → Table Editor → `profiles`, filtered by the new user's id) —
      this is `handle_new_user()` firing on `auth.users` insert.
- [ ] Confirm a `notification_preferences` row was created for the same
      user — this is `handle_new_profile()` firing on `profiles` insert.
- [ ] Tap the verification link on a device with the app installed (a real
      build or dev build — not Expo Go, unless you added the `exp://**`
      redirect entry per `docs/PHASE_2B_HOSTED_SETUP.md` §F); confirm
      Murphy Method opens directly (not a browser dead end), the app
      establishes a real session via the incoming-link handler
      (`src/state/auth/process-auth-deep-link.ts`) rather than the "I've
      verified" button, and the route guard sends the user into onboarding.
- [ ] Tap an already-used or expired verification link; confirm Verify
      Email shows a plain "invalid or expired, resend" message rather than
      silently doing nothing or crashing.

### Sign in

- [ ] Sign in with the verified account; confirm the app lands on the
      correct screen for onboarding state (`docs/ROUTES.md` §3).
- [ ] Force-close and reopen the app; confirm the session persists
      (`AsyncStorage`-backed persistence, `src/services/supabase/client.ts`)
      without requiring sign-in again.
- [ ] Confirm the route guard correctly reads `profiles.onboarding_completed_at`
      for this account (test both an onboarding-incomplete and, if you can
      seed it, an onboarding-complete account).

### Sign out

- [ ] Sign out; confirm the session is cleared and any private route
      (e.g. `(tabs)/today`) is no longer reachable — the route guard
      redirects to `(auth)`.

### Password recovery (the flow this phase's redirect-URL work exists for)

- [ ] Request a password reset for the verified test account.
- [ ] Confirm the email link, when tapped on a device with the app
      installed (a real build or dev build — not Expo Go, unless you added
      the `exp://**` redirect entry per `docs/PHASE_2B_HOSTED_SETUP.md` §F),
      opens Murphy Method directly rather than a browser dead end.
- [ ] Confirm the incoming-link handler
      (`src/state/auth/process-auth-deep-link.ts`) establishes the
      recovery-scoped session and the app is forced onto
      `(auth)/reset-password` — not any other screen, even if another route
      was open at the time (`src/hooks/use-protected-route.ts` rule 4), and
      never briefly shows a private screen first.
- [ ] Set a new password; confirm `updatePasswordAndSignOut` runs (the
      recovery session ends and the app returns to Sign In).
- [ ] Sign in with the **new** password; confirm it works and the **old**
      password no longer does.
- [ ] Tap an already-used or expired reset-password link; confirm
      Reset Password shows the "this link has expired" fallback rather than
      operating on a session that was never actually established.
- [ ] Trigger the same link twice in a row (e.g. background/foreground the
      app so the OS redelivers it, or tap it twice); confirm the second
      delivery is a no-op rather than surfacing a spurious "expired" error
      for a link that just worked.

## 3. Manual: RLS isolation on the hosted backend

Using two distinct verified test accounts ("User A", "User B"):

- [ ] User A creates data in an owned table (e.g. a goal selection, a
      workout). Confirm User B's session cannot read it (app-level: the
      data never appears in User B's UI; if comfortable with Supabase
      Studio's SQL editor using each user's own JWT via `set role
authenticated; set request.jwt.claims = '...';`, confirm directly at
      the database level too).
- [ ] Confirm User B cannot write to User A's row (attempt via the app if
      a code path exists; otherwise this is already covered by the pgTAP
      suite in §1, which is the authoritative source for this class of
      check — this manual pass is a spot-check, not a replacement).
- [ ] Confirm a fully unauthenticated request (signed out, no session)
      cannot read any private table — spot-check against the actual hosted
      `anon` key, since this is the one thing local pgTAP against a
      Docker-local stack cannot fully stand in for (network-level
      reachability of the real hosted API).

## 4. Manual: BodyScan storage isolation

No capture/upload UI exists yet (`docs/DEFERRED.md` / Phase 10), so this is
a storage-API-level check, not an in-app one:

- [ ] Confirm the `bodyscans` bucket shows as **private** in the Supabase
      dashboard (Storage → bodyscans → bucket settings) — this is also
      asserted by `supabase/tests/database/12_hosted_structural_verification.sql`
      in §1, but worth a visual confirmation in the dashboard too.
- [ ] Using each test user's own session (not the service-role key), attempt
      to read/write an object under the other user's `{user_id}/...` path
      prefix; confirm it is denied.
- [ ] Confirm an unauthenticated request to any object path is denied.

## 5. Decision: no automated hosted smoke-test harness for Phase 2B

Evaluated per this phase's brief and decided **against** building one now.
Recorded here (and in `docs/DECISIONS.md`) rather than silently skipped:

**What was considered:** a small script/CI job that signs up temporary test
users against the real hosted project, exercises RLS as those users, and
tears the accounts down — automating §2/§3 above instead of leaving them
manual.

**Why not now:**

- The authoritative RLS claim is already covered by `supabase test db
--linked` (§1), which runs as the actual `authenticated`/`anon`/
  `service_role` Postgres roles against the real database — a from-scratch
  app-level smoke test would mostly re-prove the same thing through a
  slower, less precise path (real email delivery, real network calls).
- A safe implementation would still need a trusted, credential-holding
  environment to run privileged cleanup (deleting the temporary auth users
  afterward requires the service-role key, which must never be reachable
  from anywhere the app itself runs) — that's meaningful additional
  CI/secrets-handling surface for a hosted **development** project that
  doesn't yet have real user data to protect against test pollution.
- Phase 2B's own brief is explicit: "do not add unnecessary complexity
  merely to automate something better verified safely another way." The
  manual plan above already gives a precise, repeatable checklist; nothing
  here is high-frequency enough yet (this runs once per hosted deploy, not
  per-commit) to justify the extra secret-handling surface a real
  smoke-test harness would add.

**Revisit when:** a production project is being stood up (higher stakes,
worth the investment), or hosted deploys become frequent enough that the
manual pass becomes a real bottleneck. If built later, it must follow the
constraints already stated in this phase's brief: service-role credentials
usable only in a trusted CI/server environment, never the app; uniquely
identifiable temporary test data, always deleted; redacted logs; RLS
exercised as normal users, not via a bypass.

# Android Build (EAS Preview)

Status: this document covers the infrastructure added to produce the
first installable Android build — an EAS `preview` build for the combined
real-device Auth (Phase 2B) + onboarding (Phase 3) smoke test. It does not
cover app functionality; see `docs/SUPABASE_SETUP.md` and
`docs/PHASE_2B_HOSTED_SETUP.md` for that.

## 1. Android identity

`app.json`:

- `expo.name`: `Murphy Method` (visible app name; unrelated to `slug`).
- `expo.slug`: `murphy-method` (unchanged — Expo project identity).
- `expo.scheme`: `murphymethod` (unchanged — see §3 below; this is the
  custom URL scheme, unrelated to the Android package/application ID).
- `expo.android.package`: `ie.focusedcarepsychology.murphymethod` — the
  Android application ID. Added for the first time in this change; there
  was no `android.package` previously, so no existing installed build
  exists to conflict with it.

No iOS `bundleIdentifier` was added — nothing about Android build
configuration requires one, and adding one is out of this change's scope.

## 2. `eas.json`

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Two additions beyond the bare `preview`/`internal` profile, both required
by the currently-installed `eas-cli`/`@expo/eas-json` (verified against
the versions resolved by `npx eas-cli`/`npx expo` in this repository, EAS
CLI 21.x / Expo SDK 57), not speculative extras:

- **`cli.appVersionSource: "remote"`** — without it, `eas build` in
  non-interactive mode (as CI/automation must run it) throws rather than
  building, because the CLI can no longer silently default this choice;
  it must be set explicitly in `eas.json` or chosen at an interactive
  prompt. `"remote"` (versions tracked by EAS, not by editing
  `app.json`/`build.gradle` by hand) is the current `eas build:configure`
  default and requires no other file changes.
- **`build.preview.android.buildType: "apk"`** — without it, EAS's default
  Android output is an `.aab` (Android App Bundle), which is **not**
  directly installable on a device; it must go through Google Play (or
  `bundletool`) first. The task this profile serves is "install directly
  on a real device for a smoke test," so `preview` is pinned to `apk`.
  `distribution: "internal"` (EAS's own ad-hoc-style internal
  distribution, install via QR code/link — no Google Play, no
  `expo-dev-client`) is unchanged from the brief.

No `development` or `production` profile was added — out of scope for
this change (no `expo-dev-client` requested; no Play Store submission
requested).

## 3. Deep-link / Auth safety

The custom URL scheme (`expo.scheme: "murphymethod"`) that
`murphymethod://verify-email` and `murphymethod://reset-password`
resolve to (`docs/SUPABASE_SETUP.md` §6, `src/state/auth/process-auth-deep-link.ts`)
is registered as an Android intent filter derived from `expo.scheme`
alone — it has no dependency on `android.package`. Adding
`android.package` changes the application's identity (and therefore its
installed package name / app-linking namespace for `https://` App Links,
which this app does not use), but does not change, remove, or duplicate
the `murphymethod://` intent filter. `process-auth-deep-link.ts`'s own
path matching (`pathMatches()`) is scheme/host-based, not package-based,
so it is unaffected regardless.

This was verified by inspection (no code in the auth/deep-link path reads
`android.package` or any package-derived value) and by the full existing
`process-auth-deep-link` and `auth-context` test suites continuing to
pass unchanged (§5 below) — the tests exercise scheme-based URL matching
end-to-end, so a scheme regression would fail them regardless of
`android.package`.

## 4. Supabase environment variables

See `docs/SUPABASE_SETUP.md` §6 (step 4) for exactly how
`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be
supplied to an EAS build — as EAS environment variables scoped to the
`preview` environment, never committed to this repository. Both remain
`plaintext`-safe (public, client-inlined values); no privileged
credential belongs in EAS's variable store any more than in `.env`.

## 5. Validation performed for this change

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npx expo export --platform web
node scripts/check-no-secrets.js --bundle-dir dist
npx expo config --type public --json   # confirms resolved android.package
```

See the PR this document was introduced in for the actual recorded
output. `npx expo config` is the supported way to inspect the fully
resolved config (including plugin-applied values) without running a real
build; it was used in place of an actual `eas build` invocation because
this sandbox has no authenticated EAS account/project, and a genuine
cloud build was out of scope for this change (see §6).

## 6. What remains manual (EAS account)

The project is now linked to an EAS project (see §6a). What's still
manual, requiring an authenticated EAS/Expo account:

1. Set the two `EXPO_PUBLIC_*` values as EAS environment variables for the
   `preview` environment (§4).
2. Run `npx eas build --profile preview --platform android` and install
   the resulting APK on a real device via the printed QR code/link.

## 6a. EAS project linking (done)

`app.json` now carries the confirmed EAS project identity:

- `expo.owner`: `focusedcares-team`
- `expo.extra.eas.projectId`: `d5d71b2c-531f-4ad3-af56-5ad2794ab2d1`
- Full project name: `@focusedcares-team/murphy-method`

This was confirmed authoritatively by running `eas-cli whoami` and
`eas-cli init --non-interactive` against the real EAS API from a
temporary, one-off GitHub Actions workflow authenticated with the
repository's `EXPO_TOKEN` secret (removed after use — see git history on
this branch). No project with this slug existed under the account before
this run (`eas-cli init` without `--force` failed with "Project does not
exist", proving no duplicate), so `--force` was used once absence was
confirmed, and it created exactly one project. `name`, `slug`, `scheme`,
and `android.package` were left untouched — the CLI only ever adds
`extra.eas.projectId` and `owner`; the `projectId` was never hand-typed.

**Not yet confirmed**: whether this GitHub repository is connected to
the EAS project via Expo's dashboard-level GitHub integration. `eas-cli`
21.2.0 has no CLI surface for this (`eas integrations` only covers App
Store Connect, Convex, and PostHog) — check
`https://expo.dev/accounts/focusedcares-team/projects/murphy-method/github`
directly.

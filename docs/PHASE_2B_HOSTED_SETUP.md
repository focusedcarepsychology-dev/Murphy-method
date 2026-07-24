# Phase 2B — Hosted Supabase Development Project: Setup Checklist

Status: this is a **checklist for a human to follow**, not a technical
design document (see `docs/SUPABASE_SETUP.md` for that). It is written so
it can be followed from a phone/Android browser, one step at a time, with
no coding required. Everything in the repository that can be built _before_
real credentials exist has already been built — this document is the
remaining, credential-entering part, and it is entirely yours to do. Do not
paste any of the SECRET values below into Claude, a chat tool, or any file
in this repository.

If a step says a value is **public**, it is safe to paste anywhere,
including to an AI assistant, if you ever need help. If a step says a value
is **SECRET**, it must only ever go into the one named field described in
that step — nowhere else.

---

## A. Create the Supabase development project

1. On your phone or computer, open a browser and go to
   `https://supabase.com/dashboard` and sign in (or create an account).
2. Tap/click **New project**.
3. **Organisation:** pick or create the organisation for this app.
4. **Name:** enter `Murphy Method Development` (or an equivalent clearly
   labelled "development" name — never reuse this project for production
   later; a real launch should get its own separate project).
5. **Database Password:** tap **Generate a password**, then **save it
   immediately** in a password manager (e.g. your phone's built-in
   password manager, 1Password, Bitwarden). This password is **SECRET** —
   see §D. Do not type it anywhere except the one GitHub Secret field in
   §E.2 below.
6. **Region:** choose the region closest to where you (or your first
   testers) are.
7. Tap **Create new project** and wait a few minutes for it to finish
   provisioning.

---

## B. Find the three values you'll need

Once the project is ready, open **Project Settings** (the gear icon) →
**API** (or **Data API**, depending on the current dashboard version).
You'll see:

- **Project URL** — looks like `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
- **Publishable key** (sometimes labelled "anon public") — a long string
- **Project Reference ID** — the 20-character code in the middle of the
  Project URL (also visible in **Project Settings** → **General**), e.g.
  the `xxxxxxxxxxxxxxxxxxxx` portion above

You will also need a **Personal Access Token**, which is created
separately — see §E.1.

---

## C. Which values are public / client-safe

These are safe to use in the app's client configuration. They are **not**
secret by design:

- **Project URL**
- **Publishable key** ("anon public" key)

---

## D. Which values are SECRET — never paste these into Claude, chat, or any file in this repo

- **Personal Access Token** (created in §E.1)
- **Database password** (generated in §A.5)
- **Service-role key** / "secret" key (visible in the same API settings
  page as the publishable key, further down — this app must never use it;
  see §H)

If you ever accidentally paste one of these anywhere, treat it as
compromised: go back to the Supabase dashboard and regenerate/rotate it
immediately (Project Settings → API for the service-role key; Project
Settings → Database for the database password; Account → Access Tokens for
a personal access token).

---

## E. Configure GitHub so the deploy workflow can run

All of this happens on `github.com`, in this repository's **Settings**
tab. You need to be a repository admin/owner to do this.

### E.0 — Create the GitHub Environment (once)

1. Go to this repository on GitHub → **Settings** → **Environments**.
2. Tap **New environment**, name it exactly `supabase-development`, and
   create it.
3. (Recommended) Under **Deployment protection rules**, add yourself as a
   **required reviewer** — this means the deploy workflow will pause and
   wait for your approval every time it runs, even though only you can
   trigger it. This is optional but adds a second confirmation step before
   any hosted deploy.

### E.1 — Create a Supabase Personal Access Token

1. In the Supabase dashboard, go to **Account** (your profile icon) →
   **Access Tokens**.
2. Tap **Generate new token**, name it something like
   `murphy-method-github-actions`, and copy the token immediately (it is
   only shown once).
3. This is the value for the GitHub Secret in the next step. It is
   **SECRET** (§D).

### E.2 — Add the two GitHub Secrets

Still in this repo's **Settings** → **Environments** → `supabase-development`
→ **Environment secrets** → **Add secret**:

| Secret name             | Value                                   |
| ----------------------- | --------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | the Personal Access Token from §E.1     |
| `SUPABASE_DB_PASSWORD`  | the database password you saved in §A.5 |

(If your GitHub plan/repo type doesn't offer per-environment secrets, add
these as repository-level **Settings → Secrets and variables → Actions →
Secrets** instead — the workflow reads them the same way either way.)

### E.3 — Add the one GitHub Variable

Same screen, but the **Variables** tab instead of **Secrets** (**Settings**
→ **Environments** → `supabase-development` → **Environment variables**, or
repository-level **Settings → Secrets and variables → Actions →
Variables**):

| Variable name         | Value                                     |
| --------------------- | ----------------------------------------- |
| `SUPABASE_PROJECT_ID` | the Project Reference ID from §B (public) |

This one is a **Variable**, not a **Secret** — it's not sensitive on its
own, but keeping it out of the workflow file means the same workflow can
never accidentally target the wrong project by a typo in committed code.

---

## F. Configure Supabase Auth redirect URLs (required for password recovery and signup confirmation)

In the Supabase dashboard: **Authentication** → **URL Configuration** →
**Redirect URLs**.

Add exactly both of:

```
murphymethod://reset-password
murphymethod://verify-email
```

These are the exact, specific redirects the app uses to bring a user back
into Murphy Method after they tap the password-reset link or the signup
confirmation link in their email, for a real installed build of the app (a
"standalone" or "development build," not the Expo Go app). Deliberately
**not** a wildcard — a narrower allow-list entry is safer and these are the
only two paths the app ever sends (`src/state/auth/process-auth-deep-link.ts`).

**Only if you are personally testing password recovery through the Expo Go
app** (the generic Expo Go app from the App Store/Play Store, used during
development before a real build exists) — add this additional, broader
entry too:

```
exp://**
```

This one is intentionally wide because Expo Go's own address changes every
time you start a dev session (it's tied to your computer's local network
address). Only add it if you need it, and understand it is a development
convenience, not a production-safe pattern — do not add it to a future
production Supabase project.

---

## G. Set the app's public Expo environment values

Once you (or whoever is deploying the app) is ready to point the app at
this hosted project instead of local development, these two values go into
the app's environment configuration (a local `.env` file copied from
`.env.example`, or your build/CI tool's environment variable settings —
e.g. EAS secrets if using EAS Build):

```
EXPO_PUBLIC_SUPABASE_URL=<the Project URL from §B>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<the publishable key from §B>
```

Both are public values (§C) — safe to place in `EXPO_PUBLIC_*` variables,
which Expo bakes into the app itself.

---

## H. Before you copy any key — verify which key it is

Supabase's API settings page shows **two** keys next to each other:

- **Publishable key** ("anon public") → ✅ this is the one that goes into
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` above.
- **Service-role key** ("secret") → ❌ **never** paste this into the app,
  into `.env`, into any `EXPO_PUBLIC_*` variable, or into this repository
  in any form. It grants full, unrestricted access to every user's data,
  bypassing all the privacy protections (Row Level Security) this app is
  built on. It is only ever used inside a locked-down server environment
  (a Supabase Edge Function secret), never the app.

If you're ever unsure which key you copied, don't guess — go back to the
dashboard and re-copy the one explicitly labelled "publishable"/"anon
public."

---

## What happens once this is all done

Once §A–§G above are complete, tell whoever is driving the technical side
(or come back to this Claude session) and say the setup is done. The next
step — running the **"Deploy Supabase (Development)"** GitHub Actions
workflow (`.github/workflows/deploy-supabase-dev.yml`) from the **Actions**
tab of this repository — applies the approved database migrations to your
new hosted project and runs the automated verification checks
(`docs/PHASE_2B_HOSTED_VERIFICATION.md`). No further credentials need to be
typed into Claude at any point in that process — the workflow reads
everything from the GitHub Secrets/Variables configured in §E.

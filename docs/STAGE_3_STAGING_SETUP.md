# Stage 3: hosted Supabase staging setup

This stage deploys the remediation migrations to a separate non-production Supabase project before any Android preview build is created.

The staging workflow is manual only, checks out `agent/murphy-method-complete-remediation` explicitly, requires an exact confirmation phrase, and uses the protected GitHub Environment `supabase-staging`.

## 1. Create the staging project

From the Supabase dashboard on a phone:

1. Create a new project named clearly, for example `murphy-method-staging`.
2. Choose the nearest suitable region to the intended UK and Ireland user base. Keep production in the same broad region later unless there is a clear reason not to.
3. Generate a strong database password and save it in a password manager.
4. Wait for project provisioning to finish.
5. Copy the 20-character project reference from the project URL or Project Settings.

Do not reuse a live production project for this stage.

## 2. Create a dedicated Supabase access token

1. Open Supabase account settings.
2. Open Access Tokens.
3. Create a token named `murphy-method-github-staging`.
4. Copy it once and store it securely.

Do not paste the token, database password, service-role key, or connection string into ChatGPT, repository files, issues, pull requests, or normal GitHub variables.

## 3. Create the protected GitHub Environment

From the GitHub repository on a phone:

1. Open **Settings**.
2. Open **Environments**.
3. Select **New environment**.
4. Name it exactly `supabase-staging`.
5. Add a deployment protection rule or required reviewer when the account plan supports it.

Add these environment secrets:

- `SUPABASE_ACCESS_TOKEN`: the dedicated Supabase access token.
- `SUPABASE_DB_PASSWORD`: the staging project's database password.

Add this environment variable:

- `SUPABASE_PROJECT_ID`: the 20-character staging project reference.

The project reference is an identifier rather than a password, so it belongs in Variables. The token and password belong in Secrets.

## 4. Configure mobile authentication redirects

In the staging Supabase project:

1. Open **Authentication**.
2. Open **URL Configuration**.
3. Add exactly:
   - `murphymethod://reset-password`
   - `murphymethod://verify-email`
4. Do not use a broad production wildcard.

These entries are required for password recovery and email verification in the installed Android app.

## 5. Run the staging deployment

After the environment values are saved:

1. Open the repository's **Actions** tab.
2. Open **Deploy Supabase (Staging)**.
3. Tap **Run workflow**.
4. Select `agent/murphy-method-complete-remediation` if GitHub asks which branch contains the workflow.
5. Enter the confirmation phrase exactly:

   `DEPLOY STAGING`

6. Start the workflow.

The workflow will:

1. Check out the remediation branch rather than `main`.
2. Validate the confirmation phrase and protected configuration.
3. Link the Supabase CLI to the staging project.
4. Record the existing migration state.
5. perform a migration dry run.
6. Apply the repository migrations with `supabase db push`.
7. Run the hosted-safe structural and security pgTAP verification.
8. Record the final migration state.
9. Upload private deployment diagnostics for 30 days.

## 6. Expected success result

The workflow must show green for all of these steps:

- Link to hosted staging project.
- Migration dry run.
- Apply migrations to staging.
- Hosted structural and security verification.
- Record final migration state.

The hosted project should contain the complete schema, the exercise catalogue and programme functions, with row-level security enabled and the BodyScan bucket remaining private.

## 7. What this stage does not do

This stage does not:

- deploy to production;
- merge PR #19;
- create an Android APK;
- put private credentials into the client app;
- configure the public Supabase URL and publishable key in EAS;
- prove camera, keyboard, permission or small-screen behaviour on a real phone.

Those items remain separate release gates.

## 8. Failure handling

If validation, linking, or the dry run fails, nothing should have been applied.

If `supabase db push` fails part-way through, do not assume every migration was rolled back. Read the uploaded migration-before and migration-after logs before retrying.

If migration application succeeds but hosted verification fails, the staging schema has already changed. Investigate the failed assertion before another deployment.

Never repair migration history or run ad-hoc SQL merely to make the workflow green without first identifying the underlying mismatch.

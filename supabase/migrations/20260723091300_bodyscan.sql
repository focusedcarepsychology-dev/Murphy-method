-- docs/DATABASE_SCHEMA.md §10 BodyScan + docs/ARCHITECTURE.md §9 storage
-- security foundation. This migration establishes and tests the security
-- boundary only — no capture/upload UI exists yet (Phase 10).

create table public.body_scans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  captured_on date not null,
  purpose text not null check (purpose in ('baseline', 'progress_check')),
  created_at timestamptz not null default now()
);

create index body_scans_profile_captured_idx on public.body_scans (profile_id, captured_on desc);

create table public.body_scan_images (
  id uuid primary key default gen_random_uuid(),
  body_scan_id uuid not null references public.body_scans (id) on delete cascade,
  angle text not null check (angle in ('front', 'side', 'back', 'angle_45')),
  storage_path text not null unique,
  capture_metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.body_scan_images is
  'storage_path lives under the private `bodyscans` storage bucket only, at '
  '{user_id}/{scan_id}/{image_id}.jpg — never a public bucket or permanent public URL '
  '(docs/ARCHITECTURE.md §9.1). scan_id/image_id are random UUIDs (anti-enumeration).';

create index body_scan_images_scan_angle_idx on public.body_scan_images (body_scan_id, angle);

-- P1, schema reserved now (docs/DATABASE_SCHEMA.md §10) so a future
-- Scan Reliability Score does not require a migration touching
-- body_scans/body_scan_images; not populated until Layer 5 exists.
create table public.scan_quality (
  id uuid primary key default gen_random_uuid(),
  body_scan_image_id uuid not null references public.body_scan_images (id) on delete cascade,
  reliability text not null check (reliability in ('high', 'moderate', 'low')),
  factors jsonb,
  created_at timestamptz not null default now()
);

-- RLS ---------------------------------------------------------------------

alter table public.body_scans enable row level security;

create policy "body_scans: owner select"
  on public.body_scans for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "body_scans: owner insert"
  on public.body_scans for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "body_scans: owner delete"
  on public.body_scans for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, delete on table public.body_scans to authenticated;

alter table public.body_scan_images enable row level security;

create policy "body_scan_images: owner select"
  on public.body_scan_images for select
  to authenticated
  using (
    exists (
      select 1 from public.body_scans bs
      where bs.id = body_scan_images.body_scan_id
        and bs.profile_id = (select auth.uid())
    )
  );

create policy "body_scan_images: owner insert"
  on public.body_scan_images for insert
  to authenticated
  with check (
    exists (
      select 1 from public.body_scans bs
      where bs.id = body_scan_images.body_scan_id
        and bs.profile_id = (select auth.uid())
    )
  );

create policy "body_scan_images: owner delete"
  on public.body_scan_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.body_scans bs
      where bs.id = body_scan_images.body_scan_id
        and bs.profile_id = (select auth.uid())
    )
  );

grant select, insert, delete on table public.body_scan_images to authenticated;

alter table public.scan_quality enable row level security;

create policy "scan_quality: owner select"
  on public.scan_quality for select
  to authenticated
  using (
    exists (
      select 1 from public.body_scan_images bsi
      join public.body_scans bs on bs.id = bsi.body_scan_id
      where bsi.id = scan_quality.body_scan_image_id
        and bs.profile_id = (select auth.uid())
    )
  );

grant select on table public.scan_quality to authenticated;

-- Storage: private BodyScan bucket ------------------------------------------
--
-- Object path convention: {user_id}/{scan_id}/{image_id}.jpg (and, in
-- future, a `derived/` sibling prefix for P1 computer-vision artifacts —
-- kept conceptually and architecturally separate from the original, per
-- docs/ARCHITECTURE.md §9.1). `storage.foldername(name)` splits the object
-- path on '/', so `(storage.foldername(name))[1]` is the owning user's
-- auth.uid() as text.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bodyscans', 'bodyscans', false, 15728640, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

create policy "bodyscans: owner select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'bodyscans' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "bodyscans: owner insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bodyscans' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "bodyscans: owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'bodyscans' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'bodyscans' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "bodyscans: owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'bodyscans' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- No policy grants storage access to the `anon` role for this bucket at
-- all — combined with `public = false` on the bucket row above, an
-- unauthenticated request is denied both by lacking a signed URL and by
-- having no matching storage.objects policy.

-- =====================================================================
-- J Webb Inc — Supabase setup
-- ---------------------------------------------------------------------
-- Run this ONCE in your Supabase project:
--   Dashboard → SQL Editor → New query → paste this whole file → Run
--
-- After running:
--   1. Dashboard → Authentication → Users → Add user
--      Create the admin login (email + password, check "Auto Confirm").
--      That email/password is what you'll use on admin.html.
--   2. Copy Project Settings → API → Project URL + anon public key
--      into assets/config.js. Done — the site switches to live mode.
-- =====================================================================

-- ---------- Projects table ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null default 'Commercial',
  city        text not null default '',
  description text not null default '',
  photo       text,                       -- public URL of the photo, or null
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Anyone may read (the public website shows projects).
create policy "public read projects"
  on public.projects for select
  using (true);

-- Only a signed-in admin may write.
create policy "admin insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

create policy "admin update projects"
  on public.projects for update
  to authenticated
  using (true);

create policy "admin delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- ---------- Photo storage bucket ----------
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', true)
on conflict (id) do nothing;

create policy "public read project photos"
  on storage.objects for select
  using (bucket_id = 'project-photos');

create policy "admin upload project photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-photos');

create policy "admin update project photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-photos');

create policy "admin delete project photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-photos');

-- ---------- Seed projects (same as the demo site) ----------
-- Safe to delete or edit later from admin.html.
insert into public.projects (title, category, city, featured, created_at) values
  ('Lawrence Memorial Hospital — Fire Alarm Retrofit',        'Hospital',    'Lawrence, KS', true,  now() - interval '9 seconds'),
  ('USD 497 Elementary School — New Construction',            'School',      'Lawrence, KS', true,  now() - interval '8 seconds'),
  ('Douglas County Courthouse — System Upgrade',              'Government',  'Lawrence, KS', true,  now() - interval '7 seconds'),
  ('Commercial Office Park — Multi-Building Install',         'Commercial',  'Lawrence, KS', false, now() - interval '6 seconds'),
  ('Industrial Warehouse — Design & Install',                 'Industrial',  'Lawrence, KS', false, now() - interval '5 seconds'),
  ('Senior Living Facility — Full System Replacement',        'Residential', 'Lawrence, KS', false, now() - interval '4 seconds'),
  ('KU Research Facility — New System Design',                'School',      'Lawrence, KS', false, now() - interval '3 seconds'),
  ('Downtown Mixed-Use Building — Retrofit & Upgrade',        'Commercial',  'Lawrence, KS', false, now() - interval '2 seconds'),
  ('City of Lawrence Public Library — Inspection & Service',  'Government',  'Lawrence, KS', false, now() - interval '1 second');

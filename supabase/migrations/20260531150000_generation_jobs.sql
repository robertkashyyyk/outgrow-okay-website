-- Background job tracking for the Insights Content Engine. The generate-blog-batch
-- edge function writes rows here with the service role (bypassing RLS); the Studio
-- reads them to show live progress. Admins can read (and manage) their jobs; nobody
-- else sees them.

create table if not exists public.generation_jobs (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'blog_batch',
  status     text not null default 'running',   -- running | complete | failed
  progress   integer not null default 0,
  total      integer not null default 0,
  message    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_jobs_created_at_idx
  on public.generation_jobs (created_at desc);

alter table public.generation_jobs enable row level security;

-- The service role bypasses RLS, so the edge function's inserts/updates need no
-- policy. These cover the authenticated Studio admin reading progress + manual tidy.
drop policy if exists "Jobs: admins read" on public.generation_jobs;
create policy "Jobs: admins read"
  on public.generation_jobs for select
  using (public.is_admin());

drop policy if exists "Jobs: admins insert" on public.generation_jobs;
create policy "Jobs: admins insert"
  on public.generation_jobs for insert
  with check (public.is_admin());

drop policy if exists "Jobs: admins update" on public.generation_jobs;
create policy "Jobs: admins update"
  on public.generation_jobs for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Jobs: admins delete" on public.generation_jobs;
create policy "Jobs: admins delete"
  on public.generation_jobs for delete
  using (public.is_admin());

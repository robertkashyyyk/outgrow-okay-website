-- Bottleneck Workbook — a prospect fills it in on the site (fresh or entering findings
-- from paper) and requests a review. Written by the public workbook-submit edge function
-- via the service role, so the table stays admin-only under RLS (mirrors report_leads).
create table if not exists public.workbook_submissions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text not null,
  email          text not null,
  mode           text not null default 'online'
                   check (mode in ('online','paper')),
  constraint_text  text,
  cost_per_month   text,
  answers        jsonb not null default '{}',
  status         text not null default 'submitted'
                   check (status in ('submitted','reviewing','reviewed','archived')),
  review_notes   text,
  reviewed_at    timestamptz
);

create index if not exists workbook_submissions_created_idx
  on public.workbook_submissions (created_at desc);

alter table public.workbook_submissions enable row level security;

create policy "Workbook subs: admins read"   on public.workbook_submissions for select using (public.is_admin());
create policy "Workbook subs: admins insert" on public.workbook_submissions for insert with check (public.is_admin());
create policy "Workbook subs: admins update" on public.workbook_submissions for update using (public.is_admin()) with check (public.is_admin());
create policy "Workbook subs: admins delete" on public.workbook_submissions for delete using (public.is_admin());

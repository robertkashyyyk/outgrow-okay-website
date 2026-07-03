-- Outgrow Okay: Website Review tool (Phase 1).
--
-- A manual, warm digital-presence review: enter a prospect's email address, the tool
-- derives their domain, reads their site, and generates a review you can download and
-- send. Nothing cold — you run it for someone you're already talking to. The input
-- email is kept as the captured contact/lead.
--
-- Phase 1 is admin-only. Phase 2 adds a 'partner' role (Rebecca) with created_by
-- ownership so a partner sees only their own reviews while the admin sees all.

create table if not exists public.site_reviews (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  -- who ran it (the captured lead's owner). Null if the profile is later removed.
  created_by    uuid references public.profiles (id) on delete set null,

  -- the captured contact + what we reviewed
  input_email   text,                          -- the email address entered = the lead
  domain        text,
  website_url   text not null,
  business_name text,

  -- the generated review
  digital_score integer,
  score_label   text,
  report        jsonb,                          -- full structured review
  status        text not null default 'done'
                  check (status in ('generating', 'done', 'failed')),
  error         text
);

create index if not exists site_reviews_created_at_idx on public.site_reviews (created_at desc);
create index if not exists site_reviews_created_by_idx on public.site_reviews (created_by);

alter table public.site_reviews enable row level security;

create policy "Site reviews: admins read"   on public.site_reviews for select using (public.is_admin());
create policy "Site reviews: admins insert" on public.site_reviews for insert with check (public.is_admin());
create policy "Site reviews: admins update" on public.site_reviews for update using (public.is_admin()) with check (public.is_admin());
create policy "Site reviews: admins delete" on public.site_reviews for delete using (public.is_admin());

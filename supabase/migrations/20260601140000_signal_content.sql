-- Outgrow Okay: Signal — the founder-led content engine.
--
-- Turns anonymised consulting findings into LinkedIn-ready posts. Two tables:
--
--   content_insights — the raw material. A short, anonymised observation pulled from
--     a report, a client, a call note, or typed in by hand. ONLY rows with
--     anonymised = true are ever allowed into generation (enforced in the edge
--     function, not the DB — the flag lives here as the source of truth).
--
--   content_posts — the drafts and finished posts. Each may hang off an insight
--     (insight_id) or stand alone. Moves along an editorial pipeline by `status`.
--     The system NEVER publishes: a human approves and copy-pastes to LinkedIn.
--     scheduled_for / posted_at / linkedin_url are planning + record-keeping only;
--     nothing here triggers any external action.
--
-- Access: admin-only, gated by the security-definer is_admin() helper. Service role
-- bypasses RLS. Nothing here is public.

-- ── content_insights ─────────────────────────────────────────────────────────
create table if not exists public.content_insights (
  id          uuid primary key default gen_random_uuid(),
  summary     text not null,
  detail      text,
  sector      text,
  metric      text,
  -- Where it came from. source_ref is a loose pointer (e.g. a report or client id)
  -- with no FK, so insights survive even if the original record is gone.
  source_type text not null default 'manual'
                check (source_type in ('report', 'client', 'manual', 'call_note')),
  source_ref  uuid,
  -- HARD GATE for generation: only anonymised insights may be turned into posts.
  anonymised  boolean not null default false,
  tags        text[] not null default '{}',
  status      text not null default 'raw'
                check (status in ('raw', 'used', 'archived')),
  created_at  timestamptz not null default now()
);

create index if not exists content_insights_status_idx     on public.content_insights (status);
create index if not exists content_insights_anonymised_idx on public.content_insights (anonymised);

-- ── content_posts ────────────────────────────────────────────────────────────
create table if not exists public.content_posts (
  id            uuid primary key default gen_random_uuid(),
  insight_id    uuid references public.content_insights (id) on delete set null,
  -- LinkedIn-ready plaintext, exactly as it should be pasted.
  body          text not null,
  hook          text,
  variant_label text,
  cta_type      text not null default 'none'
                  check (cta_type in ('report', 'call', 'none')),
  status        text not null default 'drafted'
                  check (status in ('idea', 'drafted', 'in_review', 'approved', 'scheduled', 'posted', 'archived')),
  -- Planning only — setting this does NOT schedule or trigger anything.
  scheduled_for timestamptz,
  posted_at     timestamptz,
  linkedin_url  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists content_posts_status_idx        on public.content_posts (status);
create index if not exists content_posts_insight_id_idx    on public.content_posts (insight_id);
create index if not exists content_posts_scheduled_for_idx on public.content_posts (scheduled_for);

-- updated_at trigger reuses the shared set_updated_at() from the clients_contacts migration.
drop trigger if exists content_posts_set_updated_at on public.content_posts;
create trigger content_posts_set_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();

-- ── RLS: admin-only, full access ─────────────────────────────────────────────
alter table public.content_insights enable row level security;
alter table public.content_posts    enable row level security;

create policy "Insights: admins read"   on public.content_insights for select using (public.is_admin());
create policy "Insights: admins insert" on public.content_insights for insert with check (public.is_admin());
create policy "Insights: admins update" on public.content_insights for update using (public.is_admin()) with check (public.is_admin());
create policy "Insights: admins delete" on public.content_insights for delete using (public.is_admin());

create policy "Posts: admins read"   on public.content_posts for select using (public.is_admin());
create policy "Posts: admins insert" on public.content_posts for insert with check (public.is_admin());
create policy "Posts: admins update" on public.content_posts for update using (public.is_admin()) with check (public.is_admin());
create policy "Posts: admins delete" on public.content_posts for delete using (public.is_admin());

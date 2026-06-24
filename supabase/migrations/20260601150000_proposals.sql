-- Outgrow Okay: Proposals — client-facing proposal documents shown in the Portal.
--
-- A proposal belongs to a `client` (the company). Its body is either markdown (the
-- usual case — authored elsewhere, pasted in, rendered in OO styling) or a single
-- self-contained HTML document (a richer prototype/walkthrough, rendered in a
-- sandboxed iframe). Admins author them in the Studio; the customer sees only their
-- own client's *published* proposals after logging into the Portal.
--
-- Access:
--   - Admins: full CRUD (is_admin()).
--   - Customers: read-only, and only published proposals for the client they belong
--     to (resolved from contacts.profile_id). They never see drafts and can't write.
-- The service role bypasses RLS. Nothing here is public — the marketing site never
-- touches this table.

create table if not exists public.proposals (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  title           text not null,
  -- Global, URL-safe handle used by the Portal route (/portal/proposals/:slug).
  slug            text not null unique,
  -- How `body` should be rendered.
  format          text not null default 'markdown'
                    check (format in ('markdown', 'html')),
  -- markdown source, or a full self-contained HTML document.
  body            text not null,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  -- Stamped the first time the customer opens it (see mark_proposal_viewed).
  first_viewed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists proposals_client_id_idx on public.proposals (client_id);
create index if not exists proposals_status_idx    on public.proposals (status);

-- updated_at trigger reuses the shared set_updated_at() from the clients_contacts migration.
drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- ── Helper: the client(s) the current user belongs to ─────────────────────────
-- SECURITY DEFINER so a customer's RLS policy can resolve their client without
-- needing read access to the admin-only contacts table (and without recursion).
create or replace function public.my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.contacts where profile_id = auth.uid();
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.proposals enable row level security;

-- Admins: full access.
create policy "Proposals: admins read"   on public.proposals for select using (public.is_admin());
create policy "Proposals: admins insert" on public.proposals for insert with check (public.is_admin());
create policy "Proposals: admins update" on public.proposals for update using (public.is_admin()) with check (public.is_admin());
create policy "Proposals: admins delete" on public.proposals for delete using (public.is_admin());

-- Customers: read only their own client's PUBLISHED proposals. No write policy on
-- purpose — the only mutation they can do is the view stamp, via the definer RPC below.
create policy "Proposals: customers read own published"
  on public.proposals for select
  using (
    status = 'published'
    and client_id in (select public.my_client_ids())
  );

-- ── View stamp ────────────────────────────────────────────────────────────────
-- Lets a customer record that they've opened a proposal WITHOUT granting any UPDATE
-- on the table (which RLS can't restrict to a single column). Definer, but scoped:
-- it only ever touches first_viewed_at, only for a proposal the caller can actually
-- see, and only once (idempotent — never overwrites the first view).
create or replace function public.mark_proposal_viewed(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.proposals
     set first_viewed_at = now()
   where slug = p_slug
     and first_viewed_at is null
     and status = 'published'
     and client_id in (select client_id from public.contacts where profile_id = auth.uid());
end;
$$;

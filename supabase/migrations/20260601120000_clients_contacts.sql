-- Outgrow Okay: lighter CRM — clients (accounts) and contacts (people).
--
-- A `client` is a company/account. A `contact` is a person at that company. Contacts
-- are the connective tissue the Tasks module will hang off (a task FKs to a contact,
-- rolling up to a client). A contact can optionally be linked to a Portal login via
-- `profile_id` — that link is stamped when an admin invites them through the existing
-- provision-account flow. Null profile_id = not invited to the Portal yet.
--
-- Access: admin-only, gated by the security-definer is_admin() helper (from the
-- profiles migration). The service role bypasses RLS. Nothing here is public — the
-- marketing site never touches these tables.

-- ── clients ────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null,
  website       text,
  industry      text,
  status        text not null default 'prospect'
                  check (status in ('prospect', 'active', 'inactive')),
  -- No package/retainer set = 'ad_hoc'. Named packages tie to the OO stage pricing.
  package       text not null default 'ad_hoc',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── contacts ───────────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  role        text,
  is_primary  boolean not null default false,
  -- Set once the contact accepts a Portal invite; cleared if the profile is removed.
  profile_id  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_client_id_idx on public.contacts (client_id);
create index if not exists contacts_profile_id_idx on public.contacts (profile_id);

-- ── updated_at trigger (shared) ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ── RLS: admin-only, full access ─────────────────────────────────────────────
alter table public.clients enable row level security;
alter table public.contacts enable row level security;

create policy "Clients: admins read"   on public.clients for select using (public.is_admin());
create policy "Clients: admins insert" on public.clients for insert with check (public.is_admin());
create policy "Clients: admins update" on public.clients for update using (public.is_admin()) with check (public.is_admin());
create policy "Clients: admins delete" on public.clients for delete using (public.is_admin());

create policy "Contacts: admins read"   on public.contacts for select using (public.is_admin());
create policy "Contacts: admins insert" on public.contacts for insert with check (public.is_admin());
create policy "Contacts: admins update" on public.contacts for update using (public.is_admin()) with check (public.is_admin());
create policy "Contacts: admins delete" on public.contacts for delete using (public.is_admin());

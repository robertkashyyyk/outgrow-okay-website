-- Outgrow Okay: profiles + role-based access.
-- ONE Supabase Auth login for the whole app; the user's `role` decides which area
-- they land in — 'admin' → /studio (back office), 'customer' → /portal (their view).
-- Role is the server-side source of truth: client routing is UX only, RLS is the gate.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'customer'
                check (role in ('admin', 'customer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ── Role helper ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies on OTHER tables can ask "is the caller an admin?"
-- without those tables needing their own read access to profiles (and without the
-- recursion you'd hit selecting profiles from inside a profiles policy).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Read: you can always read your own row; admins can read everyone's.
create policy "Profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "Profiles: admins read all"
  on public.profiles for select
  using (public.is_admin());

-- Update: you can edit your own row; admins can edit any. Column-level protection
-- of `role` is handled by the trigger below (RLS can't gate a single column).
create policy "Profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Profiles: admins update all"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT policy on purpose: rows are created by the signup trigger (definer),
-- and the service role bypasses RLS. Nobody self-inserts a profile.

-- ── Role escalation guard ─────────────────────────────────────────────────────
-- Stops a customer from PATCHing their own role to 'admin'. Only an existing admin
-- (or the service role, used for bootstrapping the first admin) may change `role`.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.role() <> 'service_role'
     and not public.is_admin() then
    raise exception 'Only an admin may change a profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ── Auto-provision a profile on signup ─────────────────────────────────────────
-- Every new auth.users row gets a profile, defaulting to 'customer'. full_name is
-- pulled from the signup metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at upkeep ──────────────────────────────────────────────────────────
create or replace function public.set_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

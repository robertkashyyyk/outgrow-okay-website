-- Outgrow Okay: 'partner' role (Website Review Phase 2).
--
-- A partner (e.g. Rebecca) logs into the Studio but is walled to just the Website
-- Review tool. Their reviews carry created_by = their id; RLS lets a partner see only
-- their own, while an admin sees everyone's — so a partner's reviews flow up as the
-- admin's leads. Partners are NOT admins: every admin-only table stays invisible to
-- them via is_admin().

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'customer', 'partner'));

-- site_reviews: own-or-admin visibility (was admin-only).
drop policy if exists "Site reviews: admins read"   on public.site_reviews;
drop policy if exists "Site reviews: admins insert" on public.site_reviews;
drop policy if exists "Site reviews: admins delete" on public.site_reviews;

create policy "Site reviews: read own or admin"
  on public.site_reviews for select
  using (public.is_admin() or created_by = auth.uid());

create policy "Site reviews: insert own or admin"
  on public.site_reviews for insert
  with check (public.is_admin() or created_by = auth.uid());

create policy "Site reviews: delete own or admin"
  on public.site_reviews for delete
  using (public.is_admin() or created_by = auth.uid());
-- (update policy stays admin-only — partners don't edit stored reviews.)

-- Insights (blog_posts) admin access + cover-image storage.
--
-- Phase 2c: the Studio editor manages posts directly with the signed-in admin's session
-- (anon key + their JWT), so admins need full RLS on blog_posts. The existing public
-- policy (read live published posts only) stays exactly as-is, so nothing new leaks to
-- the marketing site. is_admin() is the security-definer helper from the profiles
-- migration.

create policy "Insights: admins read all"
  on public.blog_posts for select
  using (public.is_admin());

create policy "Insights: admins insert"
  on public.blog_posts for insert
  with check (public.is_admin());

create policy "Insights: admins update"
  on public.blog_posts for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Insights: admins delete"
  on public.blog_posts for delete
  using (public.is_admin());

-- Cover images live in a public storage bucket: anyone can read (the marketing site
-- renders them), only admins can write. Generation edge functions use the service role
-- and bypass these policies; this covers the editor's direct uploads.
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "blog-images: public read"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "blog-images: admins insert"
  on storage.objects for insert
  with check (bucket_id = 'blog-images' and public.is_admin());

create policy "blog-images: admins update"
  on storage.objects for update
  using (bucket_id = 'blog-images' and public.is_admin());

create policy "blog-images: admins delete"
  on storage.objects for delete
  using (bucket_id = 'blog-images' and public.is_admin());

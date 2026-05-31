-- Outgrow Okay: Insights (long-form posts).
-- Written by the Studio / generation pipeline via the service-role key (bypasses RLS).
-- Public read is allowed ONLY for published, live posts so the marketing site can render
-- the Insights index + article pages with the anon key. Drafts / scheduled / pending
-- posts stay invisible to the public key until they go live.

create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  subtitle        text,
  excerpt         text,
  content         text not null default '',
  cover_image_url text,
  tags            text[] not null default '{}',
  status          text not null default 'draft'
                    check (status in ('draft', 'pending_review', 'scheduled', 'published')),
  scheduled_at    timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index for the public reader's hot path: live published posts, newest first.
create index if not exists blog_posts_published_idx
  on public.blog_posts (published_at desc)
  where status = 'published';

alter table public.blog_posts enable row level security;

-- Public read: only posts that are published AND whose go-live moment has passed.
-- This is the only policy, so anon/auth keys can read nothing else; all writes go
-- through the service role (edge functions / Studio), which bypasses RLS entirely.
create policy "Public can read live published posts"
  on public.blog_posts
  for select
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

-- Keep updated_at honest on any write.
create or replace function public.set_blog_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_blog_posts_updated_at();

-- Insights: optional call-to-action button on a post.
-- Both nullable — a post shows the CTA only when it has both a label and a URL.
-- cta_url is usually an internal path ("/review", "/book"); the reader renders it
-- with the router when it starts with "/", otherwise as a plain external anchor.

alter table public.blog_posts
  add column if not exists cta_label text,
  add column if not exists cta_url   text;

-- Outgrow Okay: Website Review v2 — richer signals.
--
-- Adds a homepage screenshot and a `signals` blob of MEASURED facts (tech stack,
-- Google Lighthouse scores, page count/freshness, on-page SEO checks, media) that sit
-- alongside the AI narrative in `report`. Screenshots live in a public storage bucket.

alter table public.site_reviews
  add column if not exists screenshot_url text,
  add column if not exists signals        jsonb;

-- Public bucket for the homepage screenshots embedded in reports.
insert into storage.buckets (id, name, public)
values ('site-reviews', 'site-reviews', true)
on conflict (id) do nothing;

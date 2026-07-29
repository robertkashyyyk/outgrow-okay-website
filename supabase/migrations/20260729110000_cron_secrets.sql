-- Shared secrets for machine-to-machine calls (pg_cron -> edge function).
-- RLS on with no policies => only the service role / superuser can read it, so the
-- secret never reaches the anon/authed client. The value is generated in-DB.

create table if not exists public.cron_secrets (
  name   text primary key,
  secret text not null default gen_random_uuid()::text
);
alter table public.cron_secrets enable row level security;

insert into public.cron_secrets (name)
values ('weekly_insight')
on conflict (name) do nothing;

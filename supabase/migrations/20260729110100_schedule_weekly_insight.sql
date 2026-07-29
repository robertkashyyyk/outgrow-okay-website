-- Weekly auto-insight schedule. Fires Sundays at 11:00 and 12:00 UTC; the edge
-- function's UK-noon guard means only the 12:00-UK firing writes a post (BST or GMT),
-- the other no-ops. The cron secret is read in-DB so it never leaves the database.
-- Requires: public.cron_secrets ('weekly_insight') and the generate-weekly-insight
-- edge function (deployed with verify_jwt = false; it authenticates the x-cron-key).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'weekly-insight',
  '0 11,12 * * 0',
  $cron$
  select net.http_post(
    url := 'https://isldzythfgmxvyfgveji.supabase.co/functions/v1/generate-weekly-insight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select secret from public.cron_secrets where name = 'weekly_insight')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
  $cron$
);

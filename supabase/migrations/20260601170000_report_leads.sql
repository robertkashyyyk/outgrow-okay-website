-- Outgrow Okay: Inbound Report Funnel (v1).
--
-- One row per person who enters the /review funnel. They give name + email at the
-- gate (status 'captured'), run the operational-review exercise in their own AI, then
-- return via a tokenised link and paste the finished report (status 'submitted').
-- Robert writes the "read" by hand in the Studio and marks it sent (status 'read_sent').
--
-- 1 lead -> 0-or-1 report: the report_* fields stay null until (if) they return.
--
-- Access: admin-only via is_admin(). The public gate + return write through
-- service-role edge functions (report-funnel-capture / report-funnel-submit), so anon
-- never touches this table directly. No scoring, no auto-read — out of scope for v1.

create table if not exists public.report_leads (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  -- captured at the gate
  name           text not null,
  email          text not null,
  return_token   text not null unique,        -- powers the personal return link
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,

  -- lifecycle: captured -> submitted -> read_sent
  status         text not null default 'captured'
                   check (status in ('captured', 'submitted', 'read_sent')),

  -- captured on return
  report_text    text,
  submitted_at   timestamptz,

  -- Robert's manual read
  read_notes     text,
  read_sent_at   timestamptz
);

create index if not exists report_leads_status_idx     on public.report_leads (status);
create index if not exists report_leads_created_at_idx on public.report_leads (created_at desc);

alter table public.report_leads enable row level security;

create policy "Report leads: admins read"   on public.report_leads for select using (public.is_admin());
create policy "Report leads: admins insert" on public.report_leads for insert with check (public.is_admin());
create policy "Report leads: admins update" on public.report_leads for update using (public.is_admin()) with check (public.is_admin());
create policy "Report leads: admins delete" on public.report_leads for delete using (public.is_admin());

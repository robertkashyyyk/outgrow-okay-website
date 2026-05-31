-- Outgrow Okay: discovery-call bookings.
-- Written only by the create-booking edge function via the service-role key (which
-- bypasses RLS). RLS is enabled with NO policies so the anon/public key can neither
-- read nor write this table directly — booking data (incl. client email) is never
-- exposed client-side.

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null,
  business_name   text,
  challenge       text,
  scheduled_at    timestamptz not null,
  google_event_id text,
  meet_link       text,
  status          text not null default 'confirmed',
  created_at      timestamptz not null default now()
);

create index if not exists bookings_scheduled_at_idx on public.bookings (scheduled_at);

alter table public.bookings enable row level security;
-- No policies: only the service role (edge function) can touch this table.

-- Outgrow Okay: Tasks — the work that hangs off the CRM.
--
-- A task always belongs to a `client` (cascade-deleted with it) and may optionally be
-- pinned to a specific `contact` (a person at that client). If that contact is later
-- removed the task survives — contact_id just goes null, the task still rolls up to the
-- client. This is the connective tissue for the Calls & Tasks pipeline.
--
-- Access: admin-only, gated by the security-definer is_admin() helper. Service role
-- bypasses RLS. Nothing here is public.

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  -- Optional: a task can be about the account generally, or about one person at it.
  contact_id   uuid references public.contacts (id) on delete set null,
  title        text not null,
  detail       text,
  status       text not null default 'todo'
                 check (status in ('todo', 'doing', 'done')),
  priority     text not null default 'normal'
                 check (priority in ('low', 'normal', 'high')),
  due_date     date,
  -- Stamped when status flips to 'done'; cleared if it's reopened.
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tasks_client_id_idx  on public.tasks (client_id);
create index if not exists tasks_contact_id_idx on public.tasks (contact_id);
create index if not exists tasks_status_idx     on public.tasks (status);
create index if not exists tasks_due_date_idx   on public.tasks (due_date);

-- updated_at trigger reuses the shared set_updated_at() from the clients_contacts migration.
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ── RLS: admin-only, full access ─────────────────────────────────────────────
alter table public.tasks enable row level security;

create policy "Tasks: admins read"   on public.tasks for select using (public.is_admin());
create policy "Tasks: admins insert" on public.tasks for insert with check (public.is_admin());
create policy "Tasks: admins update" on public.tasks for update using (public.is_admin()) with check (public.is_admin());
create policy "Tasks: admins delete" on public.tasks for delete using (public.is_admin());

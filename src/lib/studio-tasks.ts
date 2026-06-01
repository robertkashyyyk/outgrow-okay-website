// Studio-side task data access. Uses the authenticated supabase-js client; the admin
// RLS policies from the tasks migration mean an admin reads/writes everything and a
// non-admin session sees nothing. Nothing here is public.

import { supabase } from "./supabase";
import type { Task, TaskDraft } from "../types/task";

const TASK_COLS =
  "id,client_id,contact_id,title,detail,status,priority,due_date,completed_at,created_at,updated_at";

// The global Tasks list needs the client/contact names to label each row. PostgREST
// embeds the parent rows; we flatten them onto the task.
export type TaskWithRefs = Task & {
  client_name: string;
  contact_name: string | null;
};

// PostgREST may surface an embedded to-one relation as either an object or a
// single-element array depending on how it infers the FK; handle both.
type Embed<T> = T | T[] | null;
type EmbeddedRow = Task & {
  clients?: Embed<{ company_name: string }>;
  contacts?: Embed<{ name: string | null }>;
};

function one<T>(e: Embed<T>): T | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}

function flatten(row: EmbeddedRow): TaskWithRefs {
  const { clients, contacts, ...task } = row;
  return {
    ...task,
    client_name: one(clients)?.company_name ?? "—",
    contact_name: one(contacts)?.name ?? null,
  };
}

// Open tasks first (todo/doing), then by priority isn't expressible in one PostgREST
// order; we sort client-side after fetching. Done tasks sink to the bottom.
export async function listTasks(): Promise<TaskWithRefs[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_COLS}, clients(company_name), contacts(name)`)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as unknown as EmbeddedRow[] | null)?.map(flatten) ?? [];
}

// Tasks for one client (used on the client detail panel). No need for the embed here —
// the page already knows the client, and contact names are resolved locally.
export async function listClientTasks(clientId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLS)
    .eq("client_id", clientId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as Task[]) ?? [];
}

export async function createTask(draft: TaskDraft): Promise<Task> {
  // If a task is created straight into 'done', stamp completed_at to match.
  const row = {
    ...draft,
    completed_at: draft.status === "done" ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(
  id: string,
  patch: Partial<TaskDraft>,
): Promise<Task> {
  // Keep completed_at in step with status whenever status is part of the patch.
  const row: Partial<Task> = { ...patch };
  if (patch.status !== undefined) {
    row.completed_at = patch.status === "done" ? new Date().toISOString() : null;
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(row)
    .eq("id", id)
    .select(TASK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

// Convenience for the quick-complete toggle: done <-> todo.
export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  return updateTask(id, { status: done ? "done" : "todo" });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

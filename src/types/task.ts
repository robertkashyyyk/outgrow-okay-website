// Task record shape — mirrors the public.tasks table exactly. A task always belongs to
// a client and may optionally be pinned to a contact at that client. status drives the
// pipeline; completed_at is stamped when status flips to 'done'.

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: string;
  client_id: string;
  contact_id: string | null;
  title: string;
  detail: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null; // ISO date (yyyy-mm-dd)
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fields the forms own. id/completed_at/created_at/updated_at are DB- or flow-managed.
export type TaskDraft = Omit<
  Task,
  "id" | "completed_at" | "created_at" | "updated_at"
>;

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

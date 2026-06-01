import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Square,
  CalendarDays,
  Loader2,
} from "lucide-react";
import {
  listClientTasks,
  createTask,
  updateTask,
  deleteTask,
  setTaskDone,
} from "../../../lib/studio-tasks";
import {
  TASK_PRIORITY_LABEL,
  type Task,
  type TaskPriority,
} from "../../../types/task";
import { TaskEditor, type TaskFormValue } from "./TaskEditor";

const TODAY = new Date().toISOString().slice(0, 10);

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: "var(--oo-neg)",
  normal: "var(--oo-grey-400)",
  low: "var(--oo-grey-400)",
};

function formatDue(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Tasks for a single client, shown on the client detail page. Client is fixed; the
 * contact picker is scoped to this client's contacts. Manages its own load/mutation
 * state so the parent detail page stays lean.
 */
export function ClientTasksPanel({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: { id: string; name: string | null }[];
}) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listClientTasks(clientId);
        if (active) setTasks(list);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  async function refresh() {
    setTasks(await listClientTasks(clientId));
  }

  function draftFrom(v: TaskFormValue) {
    return {
      client_id: clientId,
      contact_id: v.contact_id || null,
      title: v.title,
      detail: v.detail || null,
      status: v.status,
      priority: v.priority,
      due_date: v.due_date || null,
    };
  }

  async function onAdd(v: TaskFormValue) {
    setBusyId("new");
    setError(null);
    try {
      await createTask(draftFrom(v));
      await refresh();
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onEditSave(taskId: string, v: TaskFormValue) {
    setBusyId(taskId);
    setError(null);
    try {
      await updateTask(taskId, draftFrom(v));
      await refresh();
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onAction(taskId: string, action: () => Promise<unknown>) {
    setBusyId(taskId);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const sorted = (tasks ?? []).slice().sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done"))
      return a.status === "done" ? 1 : -1;
    const p = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (p !== 0) return p;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
  const openCount = (tasks ?? []).filter((t) => t.status !== "done").length;

  return (
    <div className="mt-9">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <h2 className="font-heading font-bold text-base text-content">
          Tasks
          {tasks !== null && (
            <span className="num ml-2 text-xs text-faint">{openCount} open</span>
          )}
        </h2>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
          >
            <Plus size={15} strokeWidth={1.5} aria-hidden />
            Add task
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4">
          <TaskEditor
            clientId={clientId}
            contacts={contacts}
            onSave={onAdd}
            onCancel={() => setAdding(false)}
            busy={busyId === "new"}
          />
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      {tasks === null && !error ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : sorted.length === 0 && !adding ? (
        <p className="mt-4 text-sm text-muted">No tasks for this client yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {sorted.map((task) =>
            editingId === task.id ? (
              <li key={task.id} className="py-3">
                <TaskEditor
                  initial={task}
                  clientId={clientId}
                  contacts={contacts}
                  onSave={(v) => onEditSave(task.id, v)}
                  onCancel={() => setEditingId(null)}
                  busy={busyId === task.id}
                />
              </li>
            ) : (
              <TaskRow
                key={task.id}
                task={task}
                contactName={
                  contacts.find((c) => c.id === task.contact_id)?.name ?? null
                }
                busy={busyId === task.id}
                onToggle={() =>
                  onAction(task.id, () =>
                    setTaskDone(task.id, task.status !== "done"),
                  )
                }
                onEdit={() => {
                  setEditingId(task.id);
                  setAdding(false);
                }}
                onDelete={() => onAction(task.id, () => deleteTask(task.id))}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  contactName,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  task: Task;
  contactName: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = task.status === "done";
  const overdue = !done && task.due_date != null && task.due_date < TODAY;

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        onClick={onToggle}
        disabled={busy}
        title={done ? "Reopen" : "Mark done"}
        className="mt-0.5 p-1 rounded text-muted hover:text-content transition-colors duration-fast disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />
        ) : done ? (
          <Check size={16} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
        ) : (
          <Square size={16} strokeWidth={1.5} aria-hidden />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={"text-base " + (done ? "text-faint line-through" : "text-content")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
          {contactName && <span>{contactName}</span>}
          {task.status === "doing" && (
            <span className="num uppercase tracking-wide">In progress</span>
          )}
          {task.due_date && (
            <span
              className="num inline-flex items-center gap-1.5"
              style={overdue ? { color: "var(--oo-neg)" } : undefined}
            >
              <CalendarDays size={12} strokeWidth={1.5} aria-hidden />
              {formatDue(task.due_date)}
            </span>
          )}
          {task.priority !== "normal" && (
            <span
              className="num inline-flex items-center gap-1.5 uppercase tracking-wide"
              style={{ color: PRIORITY_COLOR[task.priority] }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
              />
              {TASK_PRIORITY_LABEL[task.priority]}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          title="Edit"
          className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
        >
          <Pencil size={15} strokeWidth={1.5} aria-hidden />
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-1">
            <button
              onClick={onDelete}
              disabled={busy}
              className="num text-xs uppercase tracking-wide px-2 py-1 rounded disabled:opacity-50"
              style={{ color: "var(--oo-neg)" }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
          >
            <Trash2 size={15} strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

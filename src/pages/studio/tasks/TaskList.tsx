import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  setTaskDone,
  type TaskWithRefs,
} from "../../../lib/studio-tasks";
import { listClients, listContacts } from "../../../lib/studio-clients";
import {
  TASK_PRIORITY_LABEL,
  type Task,
  type TaskPriority,
} from "../../../types/task";
import { TaskEditor, type TaskFormValue } from "./TaskEditor";

// Computed once at import (not during render) so the purity lint stays happy.
const TODAY = new Date().toISOString().slice(0, 10);

type Tab = "open" | "todo" | "doing" | "done" | "all";
const TABS: { id: Tab; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

// Priority sort weight (high first). Accent is reserved, so priority is shown as a
// neutral/semantic dot, never the ochre accent.
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

function matchesTab(t: Task, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "open") return t.status !== "done";
  return t.status === tab;
}

function PriorityTag({ priority }: { priority: TaskPriority }) {
  if (priority === "normal") return null;
  return (
    <span
      className="num inline-flex items-center gap-1.5 text-xs uppercase tracking-wide"
      style={{ color: PRIORITY_COLOR[priority] }}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: PRIORITY_COLOR[priority] }}
      />
      {TASK_PRIORITY_LABEL[priority]}
    </span>
  );
}

export function TaskList() {
  const [tasks, setTasks] = useState<TaskWithRefs[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("open");

  // Add/edit state
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [editorContacts, setEditorContacts] = useState<
    { id: string; name: string | null }[]
  >([]);
  const [editorClientId, setEditorClientId] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // task id or "new"

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listTasks();
        if (active) setTasks(data);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function ensureClients() {
    if (clients.length) return;
    try {
      const list = await listClients();
      setClients(list.map((c) => ({ id: c.id, company_name: c.company_name })));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadEditorContacts(clientId: string) {
    setEditorClientId(clientId);
    if (!clientId) {
      setEditorContacts([]);
      return;
    }
    try {
      const list = await listContacts(clientId);
      setEditorContacts(list.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function refresh() {
    setTasks(await listTasks());
  }

  function draftFrom(v: TaskFormValue) {
    return {
      client_id: v.client_id,
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
      setEditorClientId("");
      setEditorContacts([]);
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

  async function onTaskAction(taskId: string, action: () => Promise<unknown>) {
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

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { open: 0, todo: 0, doing: 0, done: 0, all: 0 };
    (tasks ?? []).forEach((t) => {
      c.all += 1;
      if (t.status !== "done") c.open += 1;
      c[t.status] += 1;
    });
    return c;
  }, [tasks]);

  const visible = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => matchesTab(t, tab))
      .sort((a, b) => {
        // Open before done, then priority, then due date (nulls last).
        if ((a.status === "done") !== (b.status === "done"))
          return a.status === "done" ? 1 : -1;
        const p = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (p !== 0) return p;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
  }, [tasks, tab]);

  return (
    <div className="max-w-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Studio · Tasks</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Tasks
          </h1>
        </div>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
              setEditorClientId("");
              setEditorContacts([]);
              void ensureClients();
            }}
            className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 shrink-0"
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            New task
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mt-7 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-4 py-2 text-sm transition-colors duration-fast border-b-2 -mb-px " +
              (tab === t.id
                ? "border-content text-content font-semibold"
                : "border-transparent text-muted hover:text-content")
            }
          >
            {t.label}
            <span className="num ml-2 text-xs text-faint">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {adding && (
        <div className="mt-5">
          <TaskEditor
            clientId={editorClientId}
            clients={clients}
            contacts={editorContacts}
            onClientChange={(id) => void loadEditorContacts(id)}
            onSave={onAdd}
            onCancel={() => {
              setAdding(false);
              setEditorClientId("");
              setEditorContacts([]);
            }}
            busy={busyId === "new"}
          />
        </div>
      )}

      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      <div className="mt-5">
        {tasks === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted">
            {tab === "open" ? "No open tasks. Nice." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {visible.map((task) =>
              editingId === task.id ? (
                <li key={task.id} className="py-4">
                  <TaskEditor
                    initial={task}
                    clientId={task.client_id}
                    contacts={editorContacts}
                    onSave={(v) => onEditSave(task.id, v)}
                    onCancel={() => setEditingId(null)}
                    busy={busyId === task.id}
                  />
                </li>
              ) : (
                <TaskRow
                  key={task.id}
                  task={task}
                  busy={busyId === task.id}
                  onToggle={() =>
                    onTaskAction(task.id, () =>
                      setTaskDone(task.id, task.status !== "done"),
                    )
                  }
                  onEdit={async () => {
                    setEditingId(task.id);
                    setAdding(false);
                    await loadEditorContacts(task.client_id);
                  }}
                  onDelete={() =>
                    onTaskAction(task.id, () => deleteTask(task.id))
                  }
                />
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  task: TaskWithRefs;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = task.status === "done";
  const overdue = !done && task.due_date != null && task.due_date < TODAY;

  return (
    <li className="flex items-start gap-3 py-4">
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
        <p
          className={
            "text-base " +
            (done ? "text-faint line-through" : "text-content")
          }
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
          <Link
            to={`/studio/clients/${task.client_id}`}
            className="text-muted hover:text-content transition-colors duration-fast"
          >
            {task.client_name}
          </Link>
          {task.contact_name && <span>{task.contact_name}</span>}
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
          <PriorityTag priority={task.priority} />
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

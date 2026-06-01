import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "../../../types/task";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-xs text-muted mb-1.5 num uppercase tracking-wide";

export interface TaskFormValue {
  title: string;
  detail: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string; // "" = none
  contact_id: string; // "" = none
  client_id: string;
}

type ClientOpt = { id: string; company_name: string };
type ContactOpt = { id: string; name: string | null };

/**
 * Inline add/edit form for a task. Two modes:
 *  - Client-scoped (ClientDetail panel): `clients` omitted, `clientId` fixed.
 *  - Cross-client (global Tasks page): pass `clients` + `onClientChange` so the user
 *    picks the client, which re-loads the contact options.
 */
export function TaskEditor({
  initial,
  clientId,
  clients,
  contacts,
  onClientChange,
  onSave,
  onCancel,
  busy,
}: {
  initial?: Partial<Task>;
  clientId: string;
  clients?: ClientOpt[];
  contacts: ContactOpt[];
  onClientChange?: (clientId: string) => void;
  onSave: (v: TaskFormValue) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(
    initial?.priority ?? "normal",
  );
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [contactId, setContactId] = useState(initial?.contact_id ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    onSave({
      title: title.trim(),
      detail: detail.trim(),
      status,
      priority,
      due_date: dueDate,
      contact_id: contactId,
      client_id: clientId,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4 space-y-3"
    >
      <div>
        <label className={LABEL}>Task</label>
        <input
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={FIELD}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {clients && (
          <div className="sm:col-span-2">
            <label className={LABEL}>Client</label>
            <select
              value={clientId}
              onChange={(e) => onClientChange?.(e.target.value)}
              className={FIELD}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={LABEL}>Contact</label>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className={FIELD}
            disabled={!clientId}
          >
            <option value="">No specific contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || "Unnamed contact"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className={FIELD}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className={FIELD}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea
          placeholder="Optional detail…"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !clientId}
          className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="num text-xs uppercase tracking-wide px-3 py-2 text-faint hover:text-content"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

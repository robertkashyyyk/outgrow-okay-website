import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink, Eye, CheckCircle2, Loader2 } from "lucide-react";
import {
  listAllProposals,
  getProposal,
  createProposal,
  updateProposal,
  deleteProposal,
  type ProposalWithClient,
} from "../../../lib/studio-proposals";
import { listClients } from "../../../lib/studio-clients";
import {
  PROPOSAL_STATUS_LABEL,
  formatMoney,
  type Proposal,
  type ProposalStatus,
} from "../../../types/proposal";
import { ProposalEditor, type ProposalFormValue } from "./ProposalEditor";

const STATUS_COLOR: Record<ProposalStatus, string> = {
  published: "var(--oo-pos)",
  draft: "var(--oo-warn)",
  archived: "var(--oo-grey-400)",
};

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-xs text-muted mb-1.5 num uppercase tracking-wide";

type Filter = "all" | ProposalStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// System-wide proposals: every proposal across every client, in one place. Editing
// happens inline (reusing the same editor as the client panel); a new proposal needs
// a client picked first.
export function StudioProposals() {
  const [proposals, setProposals] = useState<ProposalWithClient[] | null>(null);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [adding, setAdding] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [props, cls] = await Promise.all([listAllProposals(), listClients()]);
        if (active) {
          setProposals(props);
          setClients(cls.map((c) => ({ id: c.id, company_name: c.company_name })));
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setProposals(await listAllProposals());
  }

  const counts = useMemo(() => {
    const p = proposals ?? [];
    return {
      all: p.length,
      draft: p.filter((x) => x.status === "draft").length,
      published: p.filter((x) => x.status === "published").length,
      archived: p.filter((x) => x.status === "archived").length,
    };
  }, [proposals]);

  const shown = (proposals ?? []).filter((p) => filter === "all" || p.status === filter);

  async function onAdd(v: ProposalFormValue) {
    if (!newClientId) {
      setError("Pick a client for this proposal.");
      return;
    }
    setBusyId("new");
    setError(null);
    try {
      await createProposal({ client_id: newClientId, ...v });
      await refresh();
      setAdding(false);
      setNewClientId("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onOpenEditor(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const full = await getProposal(id);
      if (full) {
        setEditing(full);
        setAdding(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onEditSave(id: string, v: ProposalFormValue) {
    setBusyId(id);
    setError(null);
    try {
      await updateProposal(id, v);
      await refresh();
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteProposal(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Proposals
          </h1>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 shrink-0"
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            New proposal
          </button>
        )}
      </div>

      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      {adding && (
        <div className="mt-6 space-y-3">
          <div className="max-w-sm">
            <label className={LABEL}>Client</label>
            <select
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
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
          <ProposalEditor
            onSave={onAdd}
            onCancel={() => {
              setAdding(false);
              setNewClientId("");
            }}
            busy={busyId === "new"}
          />
        </div>
      )}

      {editing && (
        <div className="mt-6">
          <p className="mb-2 num text-xs uppercase tracking-wide text-faint">
            Editing · {editing.title}
          </p>
          <ProposalEditor
            initial={editing}
            onSave={(v) => onEditSave(editing.id, v)}
            onCancel={() => setEditing(null)}
            busy={busyId === editing.id}
          />
        </div>
      )}

      {!adding && !editing && (
        <>
          {/* Filter tabs */}
          <div className="mt-7 flex flex-wrap gap-1 border-b border-line">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={
                  "px-4 py-2 text-sm transition-colors duration-fast border-b-2 -mb-px " +
                  (filter === f.id
                    ? "border-content text-content font-semibold"
                    : "border-transparent text-muted hover:text-content")
                }
              >
                {f.label}
                <span className="num ml-2 text-xs text-faint">{counts[f.id]}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            {proposals === null && !error ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : shown.length === 0 ? (
              <p className="text-sm text-muted">
                {(proposals?.length ?? 0) === 0
                  ? "No proposals yet. Create the first one."
                  : "No proposals in this view."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {shown.map((p) => (
                  <ProposalRow
                    key={p.id}
                    proposal={p}
                    busy={busyId === p.id}
                    onEdit={() => onOpenEditor(p.id)}
                    onDelete={() => onDelete(p.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProposalRow({
  proposal,
  busy,
  onEdit,
  onDelete,
}: {
  proposal: ProposalWithClient;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-base text-content">{proposal.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
          <span
            className="num inline-flex items-center gap-1.5 uppercase tracking-wide"
            style={{ color: STATUS_COLOR[proposal.status] }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[proposal.status] }}
            />
            {PROPOSAL_STATUS_LABEL[proposal.status]}
          </span>
          <Link
            to={`/studio/clients/${proposal.client_id}`}
            className="text-muted hover:text-content transition-colors duration-fast"
          >
            {proposal.client_name}
          </Link>
          <span className="num">/{proposal.slug}</span>
          <span>{formatDate(proposal.created_at)}</span>
          {proposal.amount_pence != null && (
            <span className="num">
              {formatMoney(proposal.amount_pence, proposal.currency)}
            </span>
          )}
          {proposal.first_viewed_at && (
            <span className="inline-flex items-center gap-1" style={{ color: "var(--oo-pos)" }}>
              <Eye size={12} strokeWidth={1.5} aria-hidden />
              Opened
            </span>
          )}
          {proposal.paid_at && (
            <span
              className="num inline-flex items-center gap-1 uppercase tracking-wide"
              style={{ color: "var(--oo-pos)" }}
            >
              <CheckCircle2 size={12} strokeWidth={1.5} aria-hidden />
              Paid
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Link
          to={`/studio/proposals/${proposal.slug}`}
          title="Preview (as the client sees it)"
          className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
        >
          <ExternalLink size={15} strokeWidth={1.5} aria-hidden />
        </Link>
        <button
          onClick={onEdit}
          disabled={busy}
          title="Edit"
          className="p-2 rounded text-muted hover:text-content transition-colors duration-fast disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden />
          ) : (
            <Pencil size={15} strokeWidth={1.5} aria-hidden />
          )}
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

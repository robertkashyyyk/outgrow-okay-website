import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink, Eye, Loader2 } from "lucide-react";
import {
  listClientProposals,
  getProposal,
  createProposal,
  updateProposal,
  deleteProposal,
} from "../../../lib/studio-proposals";
import {
  PROPOSAL_STATUS_LABEL,
  type Proposal,
  type ProposalStatus,
  type ProposalSummary,
} from "../../../types/proposal";
import { ProposalEditor, type ProposalFormValue } from "./ProposalEditor";

const STATUS_COLOR: Record<ProposalStatus, string> = {
  published: "var(--oo-pos)",
  draft: "var(--oo-warn)",
  archived: "var(--oo-grey-400)",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Proposals for a single client, shown on the client detail page. Mirrors the Tasks
 * panel: self-contained load/mutation state. The editor opens inline; editing pulls
 * the full body (the list only carries summaries).
 */
export function ClientProposalsPanel({ clientId }: { clientId: string }) {
  const [proposals, setProposals] = useState<ProposalSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listClientProposals(clientId);
        if (active) setProposals(list);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  async function refresh() {
    setProposals(await listClientProposals(clientId));
  }

  async function onAdd(v: ProposalFormValue) {
    setBusyId("new");
    setError(null);
    try {
      await createProposal({ client_id: clientId, ...v });
      await refresh();
      setAdding(false);
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
    <div className="mt-9">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <h2 className="font-heading font-bold text-base text-content">
          Proposals
          {proposals !== null && (
            <span className="num ml-2 text-xs text-faint">{proposals.length}</span>
          )}
        </h2>
        {!adding && !editing && (
          <button
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
          >
            <Plus size={15} strokeWidth={1.5} aria-hidden />
            Add proposal
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      {adding && (
        <div className="mt-4">
          <ProposalEditor
            onSave={onAdd}
            onCancel={() => setAdding(false)}
            busy={busyId === "new"}
          />
        </div>
      )}

      {editing && (
        <div className="mt-4">
          <ProposalEditor
            initial={editing}
            onSave={(v) => onEditSave(editing.id, v)}
            onCancel={() => setEditing(null)}
            busy={busyId === editing.id}
          />
        </div>
      )}

      {proposals === null && !error ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : (proposals?.length ?? 0) === 0 && !adding ? (
        <p className="mt-4 text-sm text-muted">No proposals for this client yet.</p>
      ) : (
        !editing && (
          <ul className="mt-2 divide-y divide-line">
            {(proposals ?? []).map((p) => (
              <ProposalRow
                key={p.id}
                proposal={p}
                busy={busyId === p.id}
                onEdit={() => onOpenEditor(p.id)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </ul>
        )
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
  proposal: ProposalSummary;
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
          <span className="num">/{proposal.slug}</span>
          <span>{formatDate(proposal.created_at)}</span>
          {proposal.first_viewed_at && (
            <span className="inline-flex items-center gap-1" style={{ color: "var(--oo-pos)" }}>
              <Eye size={12} strokeWidth={1.5} aria-hidden />
              Opened
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

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Loader2, Check, Trash2, Send, Copy } from "lucide-react";
import {
  getLead,
  saveReadNotes,
  markReadSent,
  deleteLead,
} from "../../../lib/studio-report-funnel";
import {
  REPORT_LEAD_STATUS_LABEL,
  type ReportLead,
  type ReportLeadStatus,
} from "../../../types/report-lead";

const STATUS_COLOR: Record<ReportLeadStatus, string> = {
  captured: "var(--oo-grey-400)",
  submitted: "var(--oo-warn)",
  read_sent: "var(--oo-pos)",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportFunnelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<ReportLead | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const l = await getLead(id);
        if (!active) return;
        if (l) {
          setLead(l);
          setNotes(l.read_notes ?? "");
          setState("ready");
        } else {
          setState("notfound");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setState("ready");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function onSaveNotes() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveReadNotes(id, notes);
      setNotice("Read notes saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onMarkSent() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (notes !== (lead?.read_notes ?? "")) await saveReadNotes(id, notes);
      await markReadSent(id);
      const fresh = await getLead(id);
      setLead(fresh);
      setNotice("Marked as read sent.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    try {
      await deleteLead(id);
      navigate("/studio/report-funnel");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copyReport() {
    if (!lead?.report_text) return;
    try {
      await navigator.clipboard.writeText(lead.report_text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (state === "loading") return <p className="text-sm text-muted">Loading…</p>;
  if (state === "notfound") {
    return (
      <div className="max-w-prose">
        <Link
          to="/studio/report-funnel"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          Report Funnel
        </Link>
        <p className="mt-6 text-md text-muted">This lead doesn’t exist.</p>
      </div>
    );
  }
  if (!lead) return null;

  const mailto = `mailto:${lead.email}?subject=${encodeURIComponent(
    "Your operational review — where I'd focus first",
  )}`;

  return (
    <div className="max-w-content">
      <Link
        to="/studio/report-funnel"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        Report Funnel
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-content">{lead.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <a href={mailto} className="inline-flex items-center gap-1.5 text-muted hover:text-content transition-colors duration-fast">
              <Mail size={12} strokeWidth={1.5} aria-hidden />
              {lead.email}
            </a>
            <span
              className="num inline-flex items-center gap-1.5 uppercase tracking-wide"
              style={{ color: STATUS_COLOR[lead.status] }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[lead.status] }}
              />
              {REPORT_LEAD_STATUS_LABEL[lead.status]}
            </span>
            <span>Captured {formatDateTime(lead.created_at)}</span>
            {lead.submitted_at && <span>Submitted {formatDateTime(lead.submitted_at)}</span>}
            {lead.read_sent_at && <span>Read sent {formatDateTime(lead.read_sent_at)}</span>}
            {(lead.utm_source || lead.utm_campaign) && (
              <span className="num">
                {[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href={mailto} title="Email them" className="p-2 rounded text-muted hover:text-content transition-colors duration-fast">
            <Send size={16} strokeWidth={1.5} aria-hidden />
          </a>
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button onClick={onDelete} className="num text-xs uppercase tracking-wide px-2 py-1 rounded" style={{ color: "var(--oo-neg)" }}>
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete lead" className="p-2 rounded text-muted hover:text-content transition-colors duration-fast">
              <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>{error}</p>}
      {notice && <p className="mt-5 text-sm" style={{ color: "var(--oo-pos)" }}>{notice}</p>}

      {/* The pasted report */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
          <h2 className="num text-xs uppercase tracking-wide text-muted">Their report</h2>
          {lead.report_text && (
            <button
              onClick={() => void copyReport()}
              className="inline-flex items-center gap-2 text-xs text-muted hover:text-content transition-colors duration-fast"
            >
              {copied ? (
                <Check size={13} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
              ) : (
                <Copy size={13} strokeWidth={1.5} aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        {lead.report_text ? (
          <div className="mt-3 rounded-lg border border-line bg-surface p-5 max-h-[520px] overflow-auto">
            <p className="text-sm text-content whitespace-pre-wrap leading-relaxed">
              {lead.report_text}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No report yet — they&rsquo;ve been captured but haven&rsquo;t returned with their review.
          </p>
        )}
      </div>

      {/* Robert's read */}
      <div className="mt-8">
        <h2 className="num text-xs uppercase tracking-wide text-muted mb-2">Your read (draft here)</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          placeholder="Draft the honest read — where you'd focus first. You'll send it yourself from your own inbox."
          className="w-full bg-surface border border-line rounded-md px-4 py-3 text-sm text-content placeholder:text-faint leading-relaxed transition-colors duration-fast focus:border-accent resize-y"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void onSaveNotes()}
            disabled={busy}
            className="inline-flex items-center gap-2 border border-line rounded-md px-4 py-2 text-sm text-content hover:border-content transition-colors duration-fast disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
            Save read
          </button>
          <a
            href={mailto}
            className="inline-flex items-center gap-2 border border-line rounded-md px-4 py-2 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast"
          >
            <Mail size={14} strokeWidth={1.5} aria-hidden />
            Email {lead.name.split(" ")[0]}
          </a>
          {lead.status !== "read_sent" && (
            <button
              onClick={() => void onMarkSent()}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
            >
              <Check size={15} strokeWidth={2} aria-hidden />
              Mark read sent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

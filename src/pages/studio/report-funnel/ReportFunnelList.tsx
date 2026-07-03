import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, Eye, Send, Loader2 } from "lucide-react";
import { listLeads, sendReviewKit } from "../../../lib/studio-report-funnel";
import {
  REPORT_LEAD_STATUS_LABEL,
  type ReportLeadStatus,
  type ReportLeadSummary,
} from "../../../types/report-lead";

const STATUS_COLOR: Record<ReportLeadStatus, string> = {
  captured: "var(--oo-grey-400)",
  submitted: "var(--oo-warn)",
  read_sent: "var(--oo-pos)",
};

type Filter = "awaiting" | "captured" | "read_sent" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "awaiting", label: "Awaiting read" },
  { id: "captured", label: "Captured" },
  { id: "read_sent", label: "Read sent" },
  { id: "all", label: "All" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReportFunnelList() {
  const [leads, setLeads] = useState<ReportLeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("awaiting");

  const [sending, setSending] = useState(false);
  const [sendName, setSendName] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listLeads();
        if (active) setLeads(list);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!sendName.trim() || !sendEmail.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendReviewKit(sendName, sendEmail);
      setLeads(await listLeads());
      setNotice(`Kit sent to ${sendEmail.trim()}.`);
      setSendName("");
      setSendEmail("");
      setSending(false);
      setFilter("captured");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const l = leads ?? [];
    return {
      all: l.length,
      awaiting: l.filter((x) => x.status === "submitted").length,
      captured: l.filter((x) => x.status === "captured").length,
      read_sent: l.filter((x) => x.status === "read_sent").length,
    };
  }, [leads]);

  const shown = (leads ?? []).filter((l) =>
    filter === "all"
      ? true
      : filter === "awaiting"
        ? l.status === "submitted"
        : l.status === filter,
  );

  return (
    <div className="max-w-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Report Funnel
          </h1>
          <p className="mt-2 text-sm text-muted max-w-prose">
            Prospects who ran the operational-review exercise — from the public{" "}
            <span className="num">/review</span> page or sent from here. Read the ones
            awaiting a read, write your take, and mark it sent when you&rsquo;ve emailed it.
          </p>
        </div>
        {!sending && (
          <button
            onClick={() => {
              setSending(true);
              setNotice(null);
            }}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 shrink-0"
          >
            <Send size={15} strokeWidth={2} aria-hidden />
            Send the review kit
          </button>
        )}
      </div>

      {sending && (
        <form
          onSubmit={onSend}
          className="mt-5 rounded-lg border border-line bg-surface p-4"
        >
          <p className="text-sm text-content mb-3">
            Send the kit straight to someone — they&rsquo;ll get the warm invite email with
            their prompts and personal return link, and land here as a new lead.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Their name"
              value={sendName}
              onChange={(e) => setSendName(e.target.value)}
              className="w-full bg-ground border border-line rounded-md px-3 py-2 text-sm text-content placeholder:text-faint focus:border-accent"
              autoFocus
            />
            <input
              type="email"
              placeholder="Their email"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              className="w-full bg-ground border border-line rounded-md px-3 py-2 text-sm text-content placeholder:text-faint focus:border-accent"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !sendName.trim() || !sendEmail.trim()}
              className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
              Send kit
            </button>
            <button
              type="button"
              onClick={() => setSending(false)}
              className="num text-xs uppercase tracking-wide px-3 py-2 text-faint hover:text-content"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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

      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-pos)" }}>
          {notice}
        </p>
      )}

      <div className="mt-4">
        {leads === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((lead) => (
              <li key={lead.id}>
                <Link
                  to={`/studio/report-funnel/${lead.id}`}
                  className="group flex items-center gap-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-content">{lead.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={12} strokeWidth={1.5} aria-hidden />
                        {lead.email}
                      </span>
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
                      <span>Captured {formatDate(lead.created_at)}</span>
                      {lead.submitted_at && (
                        <span className="inline-flex items-center gap-1" style={{ color: "var(--oo-pos)" }}>
                          <Eye size={12} strokeWidth={1.5} aria-hidden />
                          Submitted {formatDate(lead.submitted_at)}
                        </span>
                      )}
                      {lead.utm_source && <span className="num">via {lead.utm_source}</span>}
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden
                    className="shrink-0 text-faint transition-colors duration-fast group-hover:text-content"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

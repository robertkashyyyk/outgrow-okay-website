import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, Eye } from "lucide-react";
import { listLeads } from "../../../lib/studio-report-funnel";
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
  const [filter, setFilter] = useState<Filter>("awaiting");

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
      <p className="eyebrow">Studio</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        Report Funnel
      </h1>
      <p className="mt-2 text-sm text-muted max-w-prose">
        Prospects who ran the operational-review exercise. Read the ones awaiting a read,
        write your take, and mark it sent when you&rsquo;ve emailed it.
      </p>

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

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { listClients, type ClientWithCount } from "../../../lib/studio-clients";
import {
  CLIENT_STATUS_LABEL,
  packageLabel,
  type ClientStatus,
} from "../../../types/client";

type Tab = "all" | ClientStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "prospect", label: "Prospects" },
  { id: "inactive", label: "Inactive" },
];

const STATUS_COLOR: Record<ClientStatus, string> = {
  active: "var(--oo-pos)",
  prospect: "var(--oo-warn)",
  inactive: "var(--oo-grey-400)",
};

function StatusTag({ status }: { status: ClientStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="num inline-flex items-center gap-2 text-xs uppercase tracking-wide"
      style={{ color }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {CLIENT_STATUS_LABEL[status]}
    </span>
  );
}

export function ClientList() {
  const [clients, setClients] = useState<ClientWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listClients();
        if (active) setClients(data);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: clients?.length ?? 0,
      active: 0,
      prospect: 0,
      inactive: 0,
    };
    clients?.forEach((cl) => (c[cl.status] += 1));
    return c;
  }, [clients]);

  const visible = useMemo(() => {
    if (!clients) return [];
    return tab === "all" ? clients : clients.filter((c) => c.status === tab);
  }, [clients, tab]);

  return (
    <div className="max-w-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Studio · Clients</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Clients
          </h1>
        </div>
        <Link
          to="/studio/clients/new"
          className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 shrink-0"
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          New client
        </Link>
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

      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      <div className="mt-5">
        {clients === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted">
            {tab === "all" ? "No clients yet." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {visible.map((client) => (
              <li key={client.id}>
                <Link
                  to={`/studio/clients/${client.id}`}
                  className="group flex items-center gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-content truncate group-hover:text-accent transition-colors duration-fast">
                      {client.company_name}
                    </p>
                    <p className="text-xs text-faint truncate">
                      {client.industry || "—"}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 w-28 shrink-0 text-xs text-faint">
                    <Users size={13} strokeWidth={1.5} aria-hidden />
                    <span className="num">
                      {client.contact_count}{" "}
                      {client.contact_count === 1 ? "contact" : "contacts"}
                    </span>
                  </div>

                  <div className="hidden md:block w-24 shrink-0 num text-xs text-faint uppercase tracking-wide">
                    {packageLabel(client.package)}
                  </div>

                  <div className="w-28 shrink-0">
                    <StatusTag status={client.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

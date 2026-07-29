import { useEffect, useState } from "react";
import { Mail, Loader2, Send, AlertTriangle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

// Admin-only: accounts that were invited but never completed onboarding
// (confirmed_at is null → they never followed a valid link and set a password).
// Reads via the admin_pending_invites() security-definer RPC (self-gated to admins).
// Resend re-sends a fresh sign-in link through the existing, admin-authorised
// provision-account function — for an already-existing (unconfirmed) email that
// takes provision-account's recovery branch. If a resend ever fails to let someone
// in, the reliable fallback is to delete the unconfirmed auth.users row and
// re-provision clean (the invite branch).

interface PendingInvite {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  invited_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function ageLabel(iso: string | null): string {
  const d = daysAgo(iso);
  if (d === null) return "—";
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

export function PendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("admin_pending_invites");
      if (!active) return;
      if (error) setError(error.message);
      else setInvites((data as PendingInvite[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function resend(inv: PendingInvite) {
    setBusyId(inv.id);
    setError(null);
    setNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke("provision-account", {
        body: { email: inv.email, full_name: inv.full_name, role: inv.role === "admin" ? "admin" : "customer" },
      });
      if (error) throw error;
      if (data?.email_sent === false) {
        setNotice(`Link re-minted for ${inv.email}, but the email didn't send — check the provision-account logs.`);
      } else {
        setNotice(`Fresh sign-in link sent to ${inv.email}.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-content">
      <p className="eyebrow">Studio</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        Pending invites
      </h1>
      <p className="mt-2 text-sm text-muted max-w-prose">
        Accounts that were invited but never activated — they haven&rsquo;t confirmed or
        signed in, so their link likely lapsed. Resend a fresh one. An invite that&rsquo;s
        been sitting for weeks usually means the link expired or landed in spam.
      </p>

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

      <div className="mt-6">
        {invites === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (invites ?? []).length === 0 ? (
          <p className="text-sm text-muted">No pending invites — everyone&rsquo;s in.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(invites ?? []).map((inv) => {
              const stale = (daysAgo(inv.invited_at ?? inv.created_at) ?? 0) >= 7;
              return (
                <li key={inv.id} className="flex items-center gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base text-content truncate">
                        {inv.full_name || inv.email}
                      </p>
                      {inv.role && inv.role !== "customer" && (
                        <span className="num text-xs uppercase tracking-wide text-faint">
                          {inv.role}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={12} strokeWidth={1.5} aria-hidden />
                        {inv.email}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={stale ? { color: "var(--oo-warn)" } : undefined}
                      >
                        {stale && <AlertTriangle size={12} strokeWidth={1.5} aria-hidden />}
                        Invited {ageLabel(inv.invited_at ?? inv.created_at)}
                      </span>
                      <span className="num uppercase tracking-wide">never signed in</span>
                    </div>
                  </div>
                  <button
                    onClick={() => void resend(inv)}
                    disabled={busyId === inv.id}
                    className="inline-flex shrink-0 items-center gap-2 border border-line rounded-md px-3 py-2 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast disabled:opacity-60"
                  >
                    {busyId === inv.id ? (
                      <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />
                    ) : (
                      <Send size={14} strokeWidth={1.5} aria-hidden />
                    )}
                    Resend
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

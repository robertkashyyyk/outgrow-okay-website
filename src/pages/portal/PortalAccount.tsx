import { useState, type FormEvent } from "react";
import { Loader2, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2.5 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-sm text-muted mb-2";

// Customer account settings. For now just a change-password form — a logged-in user
// can set a new password directly (no email link needed), which is how a client who
// was given a temporary password makes it their own.
export function PortalAccount() {
  const { profile } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (pw.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Those don’t match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) setError(error.message);
    else {
      setDone(true);
      setPw("");
      setPw2("");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-content">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        Account
      </h1>
      {profile?.email && (
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="text-content">{profile.email}</span>
        </p>
      )}

      <div className="mt-8 max-w-[420px] rounded-lg border border-line p-6">
        <h2 className="font-heading font-bold text-base text-content">
          Change your password
        </h2>
        <p className="mt-1 text-sm text-muted">
          If you signed in with a temporary password, set your own here.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="pw" className={LABEL}>
              New password
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={FIELD}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="pw2" className={LABEL}>
              Confirm new password
            </label>
            <input
              id="pw2"
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className={FIELD}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
              {error}
            </p>
          )}
          {done && (
            <p className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--oo-pos)" }}>
              <Check size={15} strokeWidth={2} aria-hidden />
              Password updated.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !pw || !pw2}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 font-heading font-bold text-sm text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}

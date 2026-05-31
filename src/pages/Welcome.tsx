import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Lockup } from "../components/Logo";
import { useGround } from "../components/useGround";
import { useAuth, homeFor } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast " +
  "focus:border-accent";

// Landing page for invited users. The invite email links here with an auth token in
// the URL; the Supabase client (detectSessionInUrl) turns that into a session, so by
// the time this renders the person is signed in but has no password yet. They set one,
// then we send them to their area. There is no public self-registration — you only
// reach a usable account by following an invite (admin- or booking-provisioned).
export function Welcome() {
  useGround("light");
  const { session, profile, loading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Once the password is set, hand off to their area.
  if (done) return <Navigate to={homeFor(profile?.role)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don’t match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-5">
        <div className="mx-auto max-w-content">
          <Link to="/" aria-label="Outgrow Okay — home">
            <Lockup ground="bone" className="h-7" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-9 flex items-center justify-center">
        <div className="w-full max-w-[400px]">
          <p className="eyebrow">Welcome</p>
          <h1 className="mt-4 font-heading font-black text-xl text-content">
            Set your password.
          </h1>

          {!loading && !session ? (
            // No session means a direct visit or an expired/used invite link.
            <p className="mt-6 text-base text-muted">
              This link has expired or already been used. Email{" "}
              <a
                href="mailto:hello@kashyyyk.co.uk"
                className="text-muted underline underline-offset-4 hover:text-content transition-colors duration-fast"
              >
                hello@kashyyyk.co.uk
              </a>{" "}
              and we’ll send you a fresh one.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted">
                Choose a password to finish setting up your account.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm text-muted mb-2"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={FIELD}
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-sm text-muted mb-2"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={FIELD}
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center bg-accent px-6 py-4 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
                >
                  {busy ? "One moment…" : "Set password & sign in"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

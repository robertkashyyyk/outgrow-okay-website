import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Lockup } from "../components/Logo";
import { useGround } from "../components/useGround";
import { useAuth, homeFor } from "../lib/auth-context";

type Mode = "signin" | "signup";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast " +
  "focus:border-accent";

export function Login() {
  useGround("light");
  const location = useLocation();
  const { session, profile, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Already signed in → send them to their area (the guard sorts out role).
  if (!loading && session) {
    const from = (location.state as { from?: { pathname?: string } } | null)
      ?.from?.pathname;
    return <Navigate to={from ?? homeFor(profile?.role)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
      // success → the redirect above fires once the session resolves.
    } else {
      const { error, needsConfirmation } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
      );
      if (error) setError(error);
      else if (needsConfirmation)
        setInfo("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
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
          <p className="eyebrow">{mode === "signin" ? "Sign in" : "Create account"}</p>
          <h1 className="mt-4 font-heading font-black text-xl text-content">
            {mode === "signin" ? "Welcome back." : "Set up your account."}
          </h1>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="block text-sm text-muted mb-2">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={FIELD}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-muted mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-muted mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm" style={{ color: "var(--oo-pos)" }}>
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center bg-accent px-6 py-4 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
            >
              {busy
                ? "One moment…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            {mode === "signin" ? (
              <>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-content underline underline-offset-4 hover:text-accent transition-colors duration-fast"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-content underline underline-offset-4 hover:text-accent transition-colors duration-fast"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

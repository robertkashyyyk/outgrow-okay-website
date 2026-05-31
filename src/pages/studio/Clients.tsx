import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "../../lib/supabase";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast " +
  "focus:border-accent";

type Result = { kind: "ok"; email: string } | { kind: "err"; message: string };

// Admin-only client provisioning. Calls the provision-account edge function, which
// creates the auth user and emails them a one-time invite link (they set their own
// password on /welcome). No password is ever handled here. The function re-checks that
// the caller is an admin server-side — this screen is just the front door.
export function Clients() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("provision-account", {
      body: { email: email.trim(), full_name: fullName.trim(), role: "customer" },
    });

    if (error) {
      // Edge function non-2xx responses surface here; try to read the JSON message.
      let message = "Something went wrong. Try again.";
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        }
      } catch {
        /* keep the generic message */
      }
      setResult({ kind: "err", message });
      setBusy(false);
      return;
    }

    if (data && (data as { error?: string }).error) {
      setResult({ kind: "err", message: (data as { error: string }).error });
      setBusy(false);
      return;
    }

    setResult({ kind: "ok", email: email.trim() });
    setFullName("");
    setEmail("");
    setBusy(false);
  }

  return (
    <div className="max-w-content">
      <p className="eyebrow">Studio · Clients</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        Clients
      </h1>
      <p className="mt-4 max-w-prose text-md text-muted">
        Invite a client to the Portal. They get a one-time link by email to set their
        own password — there&rsquo;s no public sign-up, so this is the only way in
        besides a booked discovery call.
      </p>

      <div className="mt-8 border border-line rounded-lg p-6 max-w-prose">
        <h2 className="flex items-center gap-2 font-heading font-bold text-base text-content">
          <UserPlus size={18} strokeWidth={1.5} aria-hidden />
          Invite a client
        </h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm text-muted mb-2">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="off"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-muted mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </div>

          {result?.kind === "err" && (
            <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
              {result.message}
            </p>
          )}
          {result?.kind === "ok" && (
            <p className="text-sm" style={{ color: "var(--oo-pos)" }}>
              Invite sent to {result.email}.
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center bg-accent px-6 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </form>
      </div>
    </div>
  );
}

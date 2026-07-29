import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Header } from "../sections/Header";
import { Footer } from "../sections/Footer";
import { useGround } from "../components/useGround";
import { ReviewKitPanel } from "../components/ReviewKitPanel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";

export function Review() {
  useGround("dark");
  const [params] = useSearchParams();

  const [stage, setStage] = useState<"gate" | "done">("gate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/report-funnel-capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setStage("done");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-content">
          {stage === "gate" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Value prop */}
              <div className="max-w-prose">
                <p className="eyebrow">A free operational review</p>
                <h1 className="mt-4 font-heading font-black text-2xl sm:text-3xl text-content leading-tight">
                  Find where time and money leak in your business — in about 20 minutes.
                </h1>
                <p className="mt-5 text-md text-muted leading-relaxed">
                  A short, structured exercise you run in your own AI — whichever one you
                  already use. It interviews you about how things really run day to day —
                  whether you own the whole business, run one part of it, or work for
                  yourself — then writes you a clear operational review.{" "}
                  <span className="text-content">You keep the report.</span>
                </p>
                <p className="mt-4 text-md text-muted leading-relaxed">
                  Send it back and I&rsquo;ll read it properly and come back with an honest
                  read on where I&rsquo;d focus first. That part&rsquo;s the reward — and it&rsquo;s free.
                </p>
                <ul className="mt-6 space-y-2 text-sm text-muted">
                  <li>· Runs in ChatGPT, Claude, Gemini or Copilot — your call.</li>
                  <li>· We never see your operational data while you work.</li>
                  <li>· No sales pitch to sit through — just the read.</li>
                </ul>
              </div>

              {/* Gate form */}
              <div className="rounded-lg border border-line bg-surface p-6 sm:p-7">
                <h2 className="font-heading font-bold text-lg text-content">
                  Where should I send it?
                </h2>
                <p className="mt-1.5 text-sm text-muted">
                  Your name and email — this is where the exercise and your read get sent.
                </p>
                <form onSubmit={submit} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm text-muted mb-2">
                      Your name
                    </label>
                    <input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={FIELD}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm text-muted mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={FIELD}
                      autoComplete="email"
                    />
                  </div>
                  {error && (
                    <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !name.trim() || !email.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent px-6 py-3.5 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
                  >
                    {busy && <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />}
                    Send me the exercise
                  </button>
                  <p className="text-xs text-faint leading-relaxed">
                    You&rsquo;re asking for the read, so we&rsquo;ll email you about it. Nothing else,
                    no lists. See our{" "}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-content">
                      privacy policy
                    </Link>
                    .
                  </p>
                </form>
              </div>
            </div>
          ) : (
            <div className="max-w-content">
              <div className="rounded-lg border border-line bg-surface p-6 flex items-start gap-4 max-w-prose">
                <Mail size={22} strokeWidth={1.5} aria-hidden className="shrink-0 mt-0.5 text-accent" />
                <div>
                  <h1 className="font-heading font-black text-xl text-content">
                    Check your inbox.
                  </h1>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    I&rsquo;ve sent everything to <span className="text-content">{email}</span> — including
                    your <span className="text-content">personal return link</span>. That link has your
                    prompts and it&rsquo;s where you paste the finished report. It&rsquo;ll keep, so run
                    the exercise whenever suits.
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <ReviewKitPanel />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

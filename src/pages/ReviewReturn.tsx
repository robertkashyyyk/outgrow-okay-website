import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Header } from "../sections/Header";
import { Footer } from "../sections/Footer";
import { useGround } from "../components/useGround";
import { ReviewKitPanel } from "../components/ReviewKitPanel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function ReviewReturn() {
  useGround("dark");
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (report.trim().length < 40) {
      setError("Paste the full report text — that looks too short.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/report-funnel-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ token, report_text: report.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDone(true);
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
          {!token ? (
            <div className="rounded-lg border border-line bg-surface p-6 max-w-prose">
              <h1 className="font-heading font-bold text-lg text-content">
                This link&rsquo;s missing its code.
              </h1>
              <p className="mt-2 text-sm text-muted">
                Open the return link straight from your confirmation email — it carries a
                code that tells me who you are.
              </p>
            </div>
          ) : done ? (
            <div className="rounded-lg border border-line bg-surface p-8 max-w-prose">
              <CheckCircle2 size={26} strokeWidth={1.5} aria-hidden style={{ color: "var(--oo-pos)" }} />
              <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
                Got it — thank you.
              </h1>
              <p className="mt-3 text-md text-muted leading-relaxed">
                I&rsquo;ll read this properly and come back to you with where I&rsquo;d focus first —
                the honest read, not a sales pitch. Keep an eye on your inbox.
              </p>
              <Link
                to="/"
                className="mt-6 inline-block text-sm text-muted underline underline-offset-4 hover:text-content"
              >
                Back to Outgrow Okay
              </Link>
            </div>
          ) : (
            <div className="max-w-content">
              {/* Lead with the kit — most people arriving here still need to run it. */}
              <div className="max-w-prose">
                <p className="eyebrow">Your report kit</p>
                <h1 className="mt-4 font-heading font-black text-2xl sm:text-3xl text-content leading-tight">
                  Run it, then paste it back — I&rsquo;ll send you the read.
                </h1>
                <p className="mt-4 text-md text-muted leading-relaxed">
                  Here are your two prompts. Run them in whatever AI you already use, then
                  drop the finished report at the bottom &mdash; I&rsquo;ll come back with an
                  honest take on where I&rsquo;d focus first.
                </p>
                <a
                  href="#paste"
                  className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-content"
                >
                  Already have your report? Skip to the paste box &darr;
                </a>
              </div>

              <div className="mt-9">
                <ReviewKitPanel />
              </div>

              {/* Paste box — the "when you're done" step. */}
              <div id="paste" className="mt-12 border-t border-line pt-9 max-w-prose scroll-mt-6">
                <h2 className="font-heading font-bold text-lg text-content">
                  Done? Paste your report.
                </h2>
                <p className="mt-1.5 text-sm text-muted">
                  Paste the text of the finished review. If your AI made a Google Doc, paste
                  the text itself &mdash; not the link.
                </p>
                <form onSubmit={submit} className="mt-5">
                  <label htmlFor="report" className="sr-only">
                    Your report
                  </label>
                  <textarea
                    id="report"
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    rows={12}
                    placeholder="Paste the report text here…"
                    className="w-full bg-surface border border-line rounded-md px-4 py-3 text-sm text-content placeholder:text-faint leading-relaxed transition-colors duration-fast focus:border-accent resize-y"
                  />
                  {error && (
                    <p className="mt-2 text-sm" style={{ color: "var(--oo-neg)" }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy || report.trim().length < 40}
                    className="mt-4 inline-flex items-center justify-center gap-2 bg-accent px-6 py-3.5 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
                  >
                    {busy && <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />}
                    Send it &amp; get my read
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Globe } from "lucide-react";
import { runReview, listReviews } from "../../../lib/studio-site-reviews";
import type { SiteReviewSummary } from "../../../types/site-review";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2.5 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-xs text-muted mb-1.5 num uppercase tracking-wide";

function scoreColor(score: number | null): string {
  if (score == null) return "var(--oo-grey-400)";
  if (score >= 75) return "var(--oo-pos)";
  if (score >= 45) return "var(--oo-warn)";
  return "var(--oo-neg)";
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function SiteReviewPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<SiteReviewSummary[] | null>(null);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listReviews();
        if (active) setReviews(list);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !website.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const review = await runReview({ email, website });
      navigate(`/studio/site-review/${review.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-content">
      <p className="eyebrow">Studio</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        Website Review
      </h1>
      <p className="mt-2 text-sm text-muted max-w-prose">
        Enter a prospect&rsquo;s email and it reviews their website — a digital-presence
        read you can download and send. The email is kept as the contact. Nothing goes
        out automatically.
      </p>

      {/* Run form */}
      <form onSubmit={submit} className="mt-6 rounded-lg border border-line bg-surface p-5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Their email</label>
            <input
              type="email"
              placeholder="hello@theircompany.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
              disabled={busy}
            />
          </div>
          <div>
            <label className={LABEL}>Or their website</label>
            <input
              placeholder="theircompany.co.uk"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={FIELD}
              disabled={busy}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-faint">
          A work email works on its own — we take the domain. For a personal email
          (gmail, outlook…), add their website too.
        </p>
        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--oo-neg)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || (!email.trim() && !website.trim())}
          className="mt-4 inline-flex items-center gap-2 bg-accent px-5 py-2.5 font-heading font-bold text-sm text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden />
              Reading their site…
            </>
          ) : (
            <>
              <Globe size={15} strokeWidth={2} aria-hidden />
              Run the review
            </>
          )}
        </button>
        {busy && (
          <p className="mt-2 text-xs text-faint">This takes ~20 seconds — hang tight.</p>
        )}
      </form>

      {/* Past reviews */}
      <div className="mt-9">
        <h2 className="num text-xs uppercase tracking-wide text-muted mb-3">Recent reviews</h2>
        {reviews === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (reviews?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">No reviews yet — run your first above.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(reviews ?? []).map((rv) => (
              <li key={rv.id}>
                <Link
                  to={`/studio/site-review/${rv.id}`}
                  className="group flex items-center gap-4 py-3.5"
                >
                  <span
                    className="num text-lg w-9 text-center shrink-0"
                    style={{ color: scoreColor(rv.digital_score) }}
                  >
                    {rv.digital_score ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-content truncate">
                      {rv.business_name ?? rv.domain}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                      <span className="num">{rv.domain}</span>
                      {rv.input_email && <span>{rv.input_email}</span>}
                      <span>{formatDate(rv.created_at)}</span>
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

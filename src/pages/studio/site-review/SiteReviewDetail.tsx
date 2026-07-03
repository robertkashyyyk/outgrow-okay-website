import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Mail, Trash2, Globe } from "lucide-react";
import { getReview, deleteReview } from "../../../lib/studio-site-reviews";
import { downloadReviewHtml } from "../../../content/siteReviewHtml";
import { SiteReviewReport } from "../../../components/SiteReviewReport";
import type { SiteReview } from "../../../types/site-review";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function SiteReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<SiteReview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const r = await getReview(id);
        if (!active) return;
        if (r) {
          setReview(r);
          setState("ready");
        } else {
          setState("notfound");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setState("ready");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function onDelete() {
    if (!id) return;
    try {
      await deleteReview(id);
      navigate("/studio/site-review");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (state === "loading") return <p className="text-sm text-muted">Loading…</p>;
  if (state === "notfound" || !review) {
    return (
      <div className="max-w-prose">
        <Link to="/studio/site-review" className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast">
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          Website Review
        </Link>
        <p className="mt-6 text-md text-muted">This review doesn’t exist.</p>
      </div>
    );
  }

  const mailto = review.input_email
    ? `mailto:${review.input_email}?subject=${encodeURIComponent(
        `A quick review of ${review.business_name ?? "your website"}`,
      )}`
    : undefined;

  return (
    <div className="max-w-content">
      <Link to="/studio/site-review" className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast">
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        Website Review
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-content">
            {review.business_name ?? review.domain}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <a href={review.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-content transition-colors duration-fast">
              <Globe size={12} strokeWidth={1.5} aria-hidden />
              {review.website_url}
            </a>
            {review.input_email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail size={12} strokeWidth={1.5} aria-hidden />
                {review.input_email}
              </span>
            )}
            <span>{formatDate(review.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button onClick={onDelete} className="num text-xs uppercase tracking-wide px-2 py-1 rounded" style={{ color: "var(--oo-neg)" }}>
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete review" className="p-2 rounded text-muted hover:text-content transition-colors duration-fast">
              <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Send actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => downloadReviewHtml(review)}
          className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105"
        >
          <Download size={15} strokeWidth={2} aria-hidden />
          Download report
        </button>
        {mailto && (
          <a href={mailto} className="inline-flex items-center gap-2 border border-line rounded-md px-4 py-2 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast">
            <Mail size={14} strokeWidth={1.5} aria-hidden />
            Email {review.input_email}
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-faint max-w-prose">
        Download the report, then attach it to the email — it&rsquo;s a self-contained page
        they can open in any browser.
      </p>

      {error && <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>{error}</p>}

      {/* The review */}
      <div className="mt-8">
        {review.report ? (
          <SiteReviewReport report={review.report} websiteUrl={review.website_url} />
        ) : (
          <p className="text-sm text-muted">
            {review.status === "failed"
              ? `This review failed: ${review.error ?? "unknown error"}`
              : "No report content."}
          </p>
        )}
      </div>
    </div>
  );
}

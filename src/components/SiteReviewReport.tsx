import type { SiteReviewReport } from "../types/site-review";

function scoreColor(score: number): string {
  if (score >= 75) return "var(--oo-pos)";
  if (score >= 45) return "var(--oo-warn)";
  return "var(--oo-neg)";
}

// Renders a generated website review inside the Studio. The downloadable/sendable
// version is built separately (siteReviewHtml.ts) as a self-contained branded doc.
export function SiteReviewReport({
  report,
  websiteUrl,
}: {
  report: SiteReviewReport;
  websiteUrl: string;
}) {
  return (
    <div className="space-y-8">
      {/* Score + summary */}
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-lg border border-line bg-surface px-5 py-4 text-center shrink-0">
          <p className="num text-4xl" style={{ color: scoreColor(report.digital_score) }}>
            {report.digital_score}
          </p>
          <p className="num text-xs uppercase tracking-wide text-muted mt-1">
            {report.score_label}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base text-content leading-relaxed">{report.summary}</p>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block num text-xs text-muted hover:text-content underline underline-offset-2"
          >
            {websiteUrl}
          </a>
        </div>
      </div>

      <Section title="Strengths" color="var(--oo-pos)" items={report.strengths} />
      <Section title="Opportunities" color="var(--oo-warn)" items={report.opportunities} />

      <div>
        <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">Quick wins</h3>
        <ul className="space-y-3">
          {(report.quick_wins ?? []).map((q, i) => (
            <li key={i} className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading font-bold text-sm text-content">{q.title}</p>
                {q.effort && (
                  <span className="num text-xs text-faint shrink-0">{q.effort}</span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{q.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {report.competitor_note && (
        <div>
          <h3 className="num text-xs uppercase tracking-wide text-muted mb-2">
            What competitors do better
          </h3>
          <p className="text-sm text-muted leading-relaxed max-w-prose">
            {report.competitor_note}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: { title: string; description: string }[];
}) {
  return (
    <div>
      <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">{title}</h3>
      <ul className="space-y-3">
        {(items ?? []).map((it, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <div>
              <p className="text-sm font-semibold text-content">{it.title}</p>
              <p className="mt-0.5 text-sm text-muted leading-relaxed">{it.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

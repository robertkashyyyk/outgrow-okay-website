import type { SiteReviewReport as Report, SiteSignals, SiteScorecard } from "../types/site-review";

function scoreColor(n: number, max = 100): string {
  const pct = (n / max) * 100;
  if (pct >= 70) return "var(--oo-pos)";
  if (pct >= 45) return "var(--oo-warn)";
  return "var(--oo-neg)";
}
const SCORE_KEYS: (keyof SiteScorecard)[] = ["content", "design", "seo", "tech", "findability", "conversion"];

export function SiteReviewReport({
  report,
  signals,
  screenshotUrl,
  websiteUrl,
}: {
  report: Report;
  signals: SiteSignals | null;
  screenshotUrl: string | null;
  websiteUrl: string;
}) {
  const lh = signals?.lighthouse ?? null;
  return (
    <div className="space-y-8">
      {screenshotUrl && (
        <img
          src={screenshotUrl}
          alt={`${report.business_name} homepage`}
          className="w-full rounded-lg border border-line max-h-[380px] object-cover object-top"
        />
      )}

      {/* Score + summary */}
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-lg border border-line bg-surface px-5 py-4 text-center shrink-0">
          <p className="num text-4xl" style={{ color: scoreColor(report.digital_score) }}>
            {report.digital_score}
          </p>
          <p className="num text-xs uppercase tracking-wide text-muted mt-1">{report.score_label}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base text-content leading-relaxed">{report.summary}</p>
          <a href={websiteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block num text-xs text-muted hover:text-content underline underline-offset-2">
            {websiteUrl}
          </a>
        </div>
      </div>

      {/* Scorecard */}
      {report.scorecard && (
        <div>
          <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">Scorecard</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SCORE_KEYS.map((k) => {
              const v = report.scorecard![k] ?? 0;
              return (
                <div key={k} className="rounded-md border border-line bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="num text-xs uppercase tracking-wide text-muted">{k}</span>
                    <span className="num text-sm" style={{ color: scoreColor(v, 10) }}>{v}/10</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v * 10}%`, backgroundColor: scoreColor(v, 10) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Google Lighthouse */}
      {lh && (
        <div>
          <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">Google Lighthouse (mobile)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([["Performance", lh.performance], ["SEO", lh.seo], ["Accessibility", lh.accessibility], ["Best practices", lh.best_practices]] as const).map(
              ([label, val]) => (
                <div key={label} className="rounded-md border border-line bg-surface p-3 text-center">
                  <p className="num text-2xl" style={{ color: val == null ? "var(--oo-grey-400)" : scoreColor(val) }}>
                    {val ?? "—"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Measured signals */}
      {signals && (
        <div>
          <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">Under the hood</h3>
          <div className="flex flex-wrap gap-2">
            <Chip label="Built with" value={signals.tech.platform + (signals.tech.detail ? ` ${signals.tech.detail}` : "")} />
            {signals.crawl.page_count != null && <Chip label="Pages" value={String(signals.crawl.page_count)} />}
            {signals.crawl.last_updated && <Chip label="Last updated" value={signals.crawl.last_updated.slice(0, 10)} />}
            <Chip label="Sitemap" value={signals.crawl.has_sitemap ? "yes" : "no"} good={signals.crawl.has_sitemap} />
            <Chip label="Structured data" value={signals.seo.structured_data ? "yes" : "no"} good={signals.seo.structured_data} />
            <Chip label="Meta description" value={signals.seo.meta_description ? "yes" : "no"} good={signals.seo.meta_description} />
            <Chip label="Open Graph" value={signals.seo.open_graph ? "yes" : "no"} good={signals.seo.open_graph} />
            <Chip label="Mobile-ready" value={signals.seo.mobile_viewport ? "yes" : "no"} good={signals.seo.mobile_viewport} />
            <Chip label="Video" value={String(signals.media.native_video + signals.media.youtube_embeds + signals.media.vimeo_embeds)} />
            <Chip label="Images w/o alt" value={`${signals.seo.images_missing_alt}/${signals.seo.images}`} good={signals.seo.images_missing_alt === 0} />
          </div>
        </div>
      )}

      <Section title="Strengths" color="var(--oo-pos)" items={report.strengths} />
      <Section title="Opportunities" color="var(--oo-warn)" items={report.opportunities} />

      <div>
        <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">Quick wins</h3>
        <ul className="space-y-3">
          {(report.quick_wins ?? []).map((q, i) => (
            <li key={i} className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading font-bold text-sm text-content">{q.title}</p>
                {q.effort && <span className="num text-xs text-faint shrink-0">{q.effort}</span>}
              </div>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{q.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {report.operational_signals && (
        <div>
          <h3 className="num text-xs uppercase tracking-wide text-muted mb-2">What this suggests about how they run</h3>
          <p className="text-sm text-muted leading-relaxed max-w-prose">{report.operational_signals}</p>
        </div>
      )}

      {report.competitor_note && (
        <div>
          <h3 className="num text-xs uppercase tracking-wide text-muted mb-2">What competitors do better</h3>
          <p className="text-sm text-muted leading-relaxed max-w-prose">{report.competitor_note}</p>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs">
      <span className="num text-faint uppercase tracking-wide">{label}</span>
      <span
        className="text-content"
        style={good === undefined ? undefined : { color: good ? "var(--oo-pos)" : "var(--oo-neg)" }}
      >
        {value}
      </span>
    </span>
  );
}

function Section({ title, color, items }: { title: string; color: string; items: { title: string; description: string }[] }) {
  return (
    <div>
      <h3 className="num text-xs uppercase tracking-wide text-muted mb-3">{title}</h3>
      <ul className="space-y-3">
        {(items ?? []).map((it, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
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

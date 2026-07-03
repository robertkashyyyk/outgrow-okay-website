import type { SiteReview } from "../types/site-review";

// Build a clean, self-contained, branded HTML document from a review — the thing you
// download and send on. Inline styles only (portable), light "document" palette rather
// than the dark app UI.

const INK = "#16130f";
const BONE = "#f6f1e7";
const PAPER = "#ffffff";
const ACCENT = "#b87d2a";
const LINE = "#e4dccd";
const GREY = "#6f6458";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function scoreColour(score: number): string {
  if (score >= 75) return "#3f7d4f";
  if (score >= 45) return ACCENT;
  return "#b4453e";
}

function itemRows(items: { title: string; description: string }[]): string {
  return (items ?? [])
    .map(
      (it) =>
        `<li style="margin:0 0 14px;"><span style="font-weight:600;color:${INK};">${esc(it.title)}</span><br/><span style="color:${GREY};line-height:1.6;">${esc(it.description)}</span></li>`,
    )
    .join("");
}

export function buildReviewHtml(review: SiteReview): string {
  const r = review.report;
  const name = esc(review.business_name ?? review.domain ?? "This business");
  if (!r) return `<!doctype html><title>${name}</title><p>No review.</p>`;

  const quickWins = (r.quick_wins ?? [])
    .map(
      (q) =>
        `<li style="margin:0 0 14px;"><span style="font-weight:600;color:${INK};">${esc(q.title)}</span>${q.effort ? ` <span style="font-family:'Courier New',monospace;font-size:12px;color:${GREY};">· ${esc(q.effort)}</span>` : ""}<br/><span style="color:${GREY};line-height:1.6;">${esc(q.description)}</span></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Digital presence review — ${name}</title></head>
<body style="margin:0;background:${BONE};font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <div style="max-width:720px;margin:0 auto;padding:40px 28px;">
    <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT};font-weight:700;">Digital presence review</div>
    <h1 style="font-size:30px;letter-spacing:-.02em;margin:12px 0 4px;">${name}</h1>
    <a href="${esc(review.website_url)}" style="color:${GREY};font-size:14px;text-decoration:none;">${esc(review.website_url)}</a>

    <div style="display:flex;gap:20px;align-items:center;margin:28px 0;padding:20px;background:${PAPER};border:1px solid ${LINE};border-radius:12px;">
      <div style="text-align:center;flex:none;">
        <div style="font-size:44px;font-weight:700;line-height:1;color:${scoreColour(r.digital_score)};">${r.digital_score ?? "—"}</div>
        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${GREY};margin-top:4px;">${esc(r.score_label ?? "")}</div>
      </div>
      <p style="margin:0;font-size:16px;line-height:1.6;">${esc(r.summary)}</p>
    </div>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:${GREY};margin:32px 0 12px;">Strengths</h2>
    <ul style="list-style:none;padding:0;margin:0;">${itemRows(r.strengths)}</ul>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:${GREY};margin:32px 0 12px;">Opportunities</h2>
    <ul style="list-style:none;padding:0;margin:0;">${itemRows(r.opportunities)}</ul>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:${GREY};margin:32px 0 12px;">Quick wins</h2>
    <ul style="list-style:none;padding:0;margin:0;">${quickWins}</ul>

    ${
      r.competitor_note
        ? `<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:${GREY};margin:32px 0 12px;">What competitors do better</h2><p style="color:${GREY};line-height:1.6;margin:0;">${esc(r.competitor_note)}</p>`
        : ""
    }

    <hr style="border:none;border-top:1px solid ${LINE};margin:36px 0 16px;"/>
    <p style="font-family:'Courier New',monospace;font-size:11px;color:${GREY};margin:0;">Prepared by Outgrow Okay — a trading name of Kashyyyk Ltd.</p>
  </div>
</body></html>`;
}

export function downloadReviewHtml(review: SiteReview): void {
  const blob = new Blob([buildReviewHtml(review)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = (review.domain ?? "review").replace(/[^a-z0-9]+/gi, "-");
  a.download = `digital-review-${slug}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

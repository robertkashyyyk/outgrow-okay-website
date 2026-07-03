import type { SiteReview, SiteScorecard } from "../types/site-review";

// A polished, self-contained, branded audit document from a review — download + send.
// Inline styles only; light "document" palette.

const INK = "#16130f";
const BONE = "#f6f1e7";
const PAPER = "#ffffff";
const ACCENT = "#b87d2a";
const LINE = "#e4dccd";
const GREY = "#6f6458";

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function col(n: number, max = 100): string {
  const p = (n / max) * 100;
  return p >= 70 ? "#3f7d4f" : p >= 45 ? ACCENT : "#b4453e";
}
function h2(t: string): string {
  return `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:${GREY};margin:34px 0 12px;">${t}</h2>`;
}
function itemRows(items: { title: string; description: string }[]): string {
  return (items ?? [])
    .map((it) => `<li style="margin:0 0 14px;"><span style="font-weight:600;color:${INK};">${esc(it.title)}</span><br/><span style="color:${GREY};line-height:1.6;">${esc(it.description)}</span></li>`)
    .join("");
}

const SCORE_KEYS: (keyof SiteScorecard)[] = ["content", "design", "seo", "tech", "findability", "conversion"];

export function buildReviewHtml(review: SiteReview): string {
  const r = review.report;
  const s = review.signals;
  const name = esc(review.business_name ?? review.domain ?? "This business");
  if (!r) return `<!doctype html><title>${name}</title><p>No review.</p>`;

  const scorecard = r.scorecard
    ? `${h2("Scorecard")}<table style="width:100%;border-collapse:collapse;">${SCORE_KEYS.map((k) => {
        const v = r.scorecard![k] ?? 0;
        return `<tr><td style="padding:6px 12px 6px 0;text-transform:capitalize;color:${INK};width:110px;">${k}</td><td style="padding:6px 0;"><div style="background:${LINE};border-radius:6px;height:10px;width:100%;max-width:340px;display:inline-block;vertical-align:middle;overflow:hidden;"><div style="background:${col(v, 10)};height:10px;width:${v * 10}%;"></div></div> <span style="font-family:'Courier New',monospace;font-size:12px;color:${GREY};">${v}/10</span></td></tr>`;
      }).join("")}</table>`
    : "";

  const lh = s?.lighthouse;
  const lighthouse = lh
    ? `${h2("Google Lighthouse (mobile)")}<table style="width:100%;border-collapse:collapse;"><tr>${(
        [["Performance", lh.performance], ["SEO", lh.seo], ["Accessibility", lh.accessibility], ["Best practices", lh.best_practices]] as const
      )
        .map(([label, val]) => `<td style="text-align:center;padding:10px;background:${PAPER};border:1px solid ${LINE};border-radius:10px;"><div style="font-size:26px;font-weight:700;color:${val == null ? GREY : col(val)};">${val ?? "—"}</div><div style="font-size:11px;color:${GREY};margin-top:2px;">${label}</div></td>`)
        .join('<td style="width:8px;"></td>')}</tr></table>`
    : "";

  const chip = (label: string, value: string) =>
    `<span style="display:inline-block;border:1px solid ${LINE};border-radius:6px;padding:4px 9px;margin:0 6px 6px 0;font-size:12px;"><span style="font-family:'Courier New',monospace;color:${GREY};text-transform:uppercase;">${label}</span> <span style="color:${INK};">${esc(value)}</span></span>`;
  const underHood = s
    ? `${h2("Under the hood")}<div>${chip("Built with", s.tech.platform + (s.tech.detail ? ` ${s.tech.detail}` : ""))}${s.crawl.page_count != null ? chip("Pages", String(s.crawl.page_count)) : ""}${s.crawl.last_updated ? chip("Last updated", s.crawl.last_updated.slice(0, 10)) : ""}${chip("Sitemap", s.crawl.has_sitemap ? "yes" : "no")}${chip("Structured data", s.seo.structured_data ? "yes" : "no")}${chip("Meta description", s.seo.meta_description ? "yes" : "no")}${chip("Open Graph", s.seo.open_graph ? "yes" : "no")}${chip("Mobile-ready", s.seo.mobile_viewport ? "yes" : "no")}${chip("Video", String(s.media.native_video + s.media.youtube_embeds + s.media.vimeo_embeds))}${chip("Images w/o alt", `${s.seo.images_missing_alt}/${s.seo.images}`)}</div>`
    : "";

  const quickWins = (r.quick_wins ?? [])
    .map((q) => `<li style="margin:0 0 14px;"><span style="font-weight:600;color:${INK};">${esc(q.title)}</span>${q.effort ? ` <span style="font-family:'Courier New',monospace;font-size:12px;color:${GREY};">· ${esc(q.effort)}</span>` : ""}<br/><span style="color:${GREY};line-height:1.6;">${esc(q.description)}</span></li>`)
    .join("");

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Digital presence review — ${name}</title>
<style>@page{margin:15mm;}html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style></head>
<body style="margin:0;background:${BONE};font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <div style="max-width:760px;margin:0 auto;padding:40px 28px;">
    <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT};font-weight:700;">Digital presence review</div>
    <h1 style="font-size:32px;letter-spacing:-.02em;margin:12px 0 4px;">${name}</h1>
    <a href="${esc(review.website_url)}" style="color:${GREY};font-size:14px;text-decoration:none;">${esc(review.website_url)}</a>

    ${review.screenshot_url ? `<img src="${esc(review.screenshot_url)}" alt="${name} homepage" style="width:100%;border:1px solid ${LINE};border-radius:12px;margin:22px 0 0;max-height:380px;object-fit:cover;object-position:top;"/>` : ""}

    <div style="display:flex;gap:20px;align-items:center;margin:24px 0;padding:20px;background:${PAPER};border:1px solid ${LINE};border-radius:12px;">
      <div style="text-align:center;flex:none;">
        <div style="font-size:44px;font-weight:700;line-height:1;color:${col(r.digital_score)};">${r.digital_score ?? "—"}</div>
        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${GREY};margin-top:4px;">${esc(r.score_label ?? "")}</div>
      </div>
      <p style="margin:0;font-size:16px;line-height:1.6;">${esc(r.summary)}</p>
    </div>

    ${scorecard}
    ${lighthouse}
    ${underHood}

    ${h2("Strengths")}<ul style="list-style:none;padding:0;margin:0;">${itemRows(r.strengths)}</ul>
    ${h2("Opportunities")}<ul style="list-style:none;padding:0;margin:0;">${itemRows(r.opportunities)}</ul>
    ${h2("Quick wins")}<ul style="list-style:none;padding:0;margin:0;">${quickWins}</ul>

    ${r.operational_signals ? `${h2("What this suggests about how they run")}<p style="color:${GREY};line-height:1.6;margin:0;">${esc(r.operational_signals)}</p>` : ""}
    ${r.competitor_note ? `${h2("What competitors do better")}<p style="color:${GREY};line-height:1.6;margin:0;">${esc(r.competitor_note)}</p>` : ""}

    <div style="margin:36px 0 0;padding:22px;background:${INK};color:${BONE};border-radius:12px;">
      <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${ACCENT};">The good news</div>
      <p style="margin:8px 0 0;font-size:16px;line-height:1.6;">Most of the above is quick to fix — and worth it. If you'd like a hand turning this into a shortlist of what to do first, just reply and we'll talk it through.</p>
    </div>

    <hr style="border:none;border-top:1px solid ${LINE};margin:28px 0 16px;"/>
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

// Open the branded report in a new window and fire the browser's print dialog once the
// screenshot has loaded — the user chooses "Save as PDF". Crisp, dependency-free.
export function printReviewPdf(review: SiteReview): void {
  const autoPrint = `<script>window.addEventListener('load',function(){var imgs=document.images,total=imgs.length,done=0;function go(){window.focus();window.print();}if(!total)return go();for(var i=0;i<total;i++){if(imgs[i].complete){if(++done>=total)go();}else{imgs[i].onload=imgs[i].onerror=function(){if(++done>=total)go();};}}});</scr` + `ipt>`;
  const html = buildReviewHtml(review).replace("</body>", `${autoPrint}</body>`);
  const w = window.open("", "_blank");
  if (!w) return; // popup blocked — fall back handled by the caller if needed
  w.document.open();
  w.document.write(html);
  w.document.close();
}

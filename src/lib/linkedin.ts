// Helpers for the Signal editorial board: turn a stored post body into clean LinkedIn
// paste-text, model the "…more" fold, and build UTM-tagged CTA links. LinkedIn's
// composer is plaintext-only — there is no API here, the founder pastes by hand.

import type { PostCtaType } from "../types/signal";

// LinkedIn collapses a feed post behind "…more" at roughly this many characters.
export const LINKEDIN_FOLD = 210;

// Strip any markdown the model may have slipped in, so what we copy is exactly what
// should appear on LinkedIn. Emoji and #hashtags are left literal on purpose.
export function toLinkedInPlaintext(body: string): string {
  return body
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/__(.*?)__/g, "$1") // __bold__
    .replace(/`([^`]+)`/g, "$1") // `code`
    .replace(/^#{1,6}\s+/gm, "") // # headings
    .replace(/^\s*[-*+]\s+/gm, "• ") // "- " / "* " bullets → •
    .replace(/\n{3,}/g, "\n\n") // collapse blank-line runs
    .trim();
}

// Split the body at the fold so the preview can dim what LinkedIn hides. Breaks at the
// last space before the limit so a word isn't cut in half.
export function splitAtFold(body: string): { head: string; tail: string } {
  if (body.length <= LINKEDIN_FOLD) return { head: body, tail: "" };
  let cut = body.lastIndexOf(" ", LINKEDIN_FOLD);
  if (cut < LINKEDIN_FOLD - 40 || cut <= 0) cut = LINKEDIN_FOLD;
  return { head: body.slice(0, cut), tail: body.slice(cut) };
}

// A UTM-tagged link back to the funnel, keyed to the post so clicks are attributable.
// The funnel itself is out of scope for v1 — this just generates the link to drop into
// the post or first comment. Returns null when there's no CTA.
export function buildCtaUrl(postId: string, ctaType: PostCtaType): string | null {
  if (ctaType === "none") return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = ctaType === "call" ? "/book" : "/";
  const params = new URLSearchParams({
    utm_source: "linkedin",
    utm_medium: "organic",
    utm_campaign: `post_${postId}`,
  });
  return `${origin}${path}?${params.toString()}`;
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// ── datetime-local <-> ISO helpers (for the Schedule field) ───────────────────

// ISO timestamp → value for <input type="datetime-local"> in local time.
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// datetime-local value → ISO timestamp (UTC).
export function localInputToIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

export type ProposalFormat = "markdown" | "html";
export type ProposalStatus = "draft" | "published" | "archived";

export interface Proposal {
  id: string;
  client_id: string;
  title: string;
  slug: string;
  format: ProposalFormat;
  body: string;
  status: ProposalStatus;
  // Price in minor units (pence). Null = no payment offered on this proposal.
  amount_pence: number | null;
  currency: string;
  // Stamped by the Stripe webhook when payment completes.
  paid_at: string | null;
  stripe_session_id: string | null;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// What an admin form produces. Server-managed fields are omitted.
export type ProposalDraft = Omit<
  Proposal,
  "id" | "paid_at" | "stripe_session_id" | "first_viewed_at" | "created_at" | "updated_at"
>;

// Lightweight shape for list views (no heavy body).
export type ProposalSummary = Omit<Proposal, "body">;

export const PROPOSAL_FORMATS: ProposalFormat[] = ["markdown", "html"];
export const PROPOSAL_STATUSES: ProposalStatus[] = ["draft", "published", "archived"];

export const PROPOSAL_FORMAT_LABEL: Record<ProposalFormat, string> = {
  markdown: "Markdown",
  html: "Self-contained HTML",
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

// Format a minor-unit amount for display, e.g. (200000, "gbp") -> "£2,000".
export function formatMoney(amountPence: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amountPence % 100 === 0 ? 0 : 2,
  }).format(amountPence / 100);
}

// Turn a title into a URL-safe slug. Kept here so the Studio editor and any tooling
// derive slugs identically.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

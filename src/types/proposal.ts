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
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// What an admin form produces. id/timestamps/first_viewed_at are server-managed.
export type ProposalDraft = Omit<
  Proposal,
  "id" | "first_viewed_at" | "created_at" | "updated_at"
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

// Turn a title into a URL-safe slug. Kept here so the Studio editor and any tooling
// derive slugs identically.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

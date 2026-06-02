// Signal — the founder-led LinkedIn content engine.
//
// content_insights: anonymised raw findings (the source material).
// content_posts: the drafts and finished posts that move along an editorial pipeline.
// The system never publishes — a human approves and copy-pastes. See the
// 20260601140000_signal_content.sql migration for the source of truth.

export type InsightSourceType = "report" | "client" | "manual" | "call_note";
export type InsightStatus = "raw" | "used" | "archived";

export interface ContentInsight {
  id: string;
  summary: string;
  detail: string | null;
  sector: string | null;
  metric: string | null;
  source_type: InsightSourceType;
  source_ref: string | null;
  anonymised: boolean;
  tags: string[];
  status: InsightStatus;
  created_at: string;
}

// What an add/edit form supplies. created_at/status/id are managed elsewhere.
export interface InsightDraft {
  summary: string;
  detail: string | null;
  sector: string | null;
  metric: string | null;
  source_type: InsightSourceType;
  source_ref: string | null;
  anonymised: boolean;
  tags: string[];
}

export type PostCtaType = "report" | "call" | "none";
export type PostStatus =
  | "idea"
  | "drafted"
  | "in_review"
  | "approved"
  | "scheduled"
  | "posted"
  | "archived";

export interface ContentPost {
  id: string;
  insight_id: string | null;
  body: string;
  hook: string | null;
  variant_label: string | null;
  cta_type: PostCtaType;
  status: PostStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const INSIGHT_SOURCE_LABEL: Record<InsightSourceType, string> = {
  report: "Report",
  client: "Client",
  manual: "Manual",
  call_note: "Call note",
};

export const INSIGHT_SOURCES: InsightSourceType[] = [
  "manual",
  "report",
  "client",
  "call_note",
];

export const INSIGHT_STATUS_LABEL: Record<InsightStatus, string> = {
  raw: "Raw",
  used: "Used",
  archived: "Archived",
};

export const POST_CTA_LABEL: Record<PostCtaType, string> = {
  report: "Offer a report",
  call: "Invite a call",
  none: "No CTA",
};

export const POST_CTAS: PostCtaType[] = ["none", "report", "call"];

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  idea: "Idea",
  drafted: "Drafted",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  archived: "Archived",
};

// The editorial board's column order (Archived is filtered, not a column).
export const POST_PIPELINE: PostStatus[] = [
  "idea",
  "drafted",
  "in_review",
  "approved",
  "scheduled",
  "posted",
];

// Result shape returned by the generate-content-drafts edge function.
export interface GeneratedDraftSummary {
  id: string;
  hook: string | null;
  variant_label: string | null;
  status: PostStatus;
}

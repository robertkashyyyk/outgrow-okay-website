// The Insights (blog_posts) record shape — mirrors the OO blog_posts table exactly.
// "Insight" is the OO brand term; the table is still blog_posts.

export type PostStatus = "draft" | "pending_review" | "scheduled" | "published";

export interface Insight {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  tags: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fields the editor owns. id/created_at/updated_at are managed by the DB.
export type InsightDraft = Omit<Insight, "id" | "created_at" | "updated_at">;

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  scheduled: "Scheduled",
  published: "Published",
};

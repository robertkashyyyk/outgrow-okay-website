export interface SiteReviewItem {
  title: string;
  description: string;
}
export interface SiteReviewQuickWin {
  title: string;
  description: string;
  effort: string;
}

export interface SiteReviewReport {
  business_name: string;
  digital_score: number;
  score_label: string;
  summary: string;
  strengths: SiteReviewItem[];
  opportunities: SiteReviewItem[];
  quick_wins: SiteReviewQuickWin[];
  competitor_note: string;
}

export type SiteReviewStatus = "generating" | "done" | "failed";

export interface SiteReview {
  id: string;
  created_at: string;
  created_by: string | null;
  input_email: string | null;
  domain: string | null;
  website_url: string;
  business_name: string | null;
  digital_score: number | null;
  score_label: string | null;
  report: SiteReviewReport | null;
  status: SiteReviewStatus;
  error: string | null;
}

// List view doesn't need the full report JSON.
export type SiteReviewSummary = Omit<SiteReview, "report" | "error">;

export interface SiteReviewItem {
  title: string;
  description: string;
}
export interface SiteReviewQuickWin {
  title: string;
  description: string;
  effort: string;
}

export interface SiteScorecard {
  content: number;
  design: number;
  seo: number;
  tech: number;
  findability: number;
  conversion: number;
}

export interface SiteReviewReport {
  business_name: string;
  digital_score: number;
  score_label: string;
  summary: string;
  scorecard?: SiteScorecard;
  strengths: SiteReviewItem[];
  opportunities: SiteReviewItem[];
  quick_wins: SiteReviewQuickWin[];
  operational_signals?: string;
  competitor_note: string;
}

// Measured facts gathered by the edge function (not AI narrative).
export interface SiteSignals {
  tech: {
    platform: string;
    detail: string;
    generator: string;
    server: string;
    powered_by: string;
  };
  lighthouse: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    best_practices: number | null;
  } | null;
  crawl: {
    page_count: number | null;
    has_sitemap: boolean;
    last_updated: string | null;
    has_robots: boolean;
  };
  seo: {
    has_title: boolean;
    title_len: number;
    meta_description: boolean;
    desc_len: number;
    h1_count: number;
    open_graph: boolean;
    twitter_card: boolean;
    canonical: boolean;
    mobile_viewport: boolean;
    structured_data: boolean;
    favicon: boolean;
    images: number;
    images_missing_alt: number;
  };
  media: {
    native_video: number;
    youtube_embeds: number;
    vimeo_embeds: number;
  };
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
  signals: SiteSignals | null;
  screenshot_url: string | null;
  status: SiteReviewStatus;
  error: string | null;
}

export type SiteReviewSummary = Omit<SiteReview, "report" | "signals" | "error">;

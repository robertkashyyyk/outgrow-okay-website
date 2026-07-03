// Studio-side access to Website Reviews. Running one goes through the admin/partner-
// gated site-review edge function (scrape + AI); reads/deletes use admin RLS.

import { supabase } from "./supabase";
import type { SiteReview, SiteReviewSummary } from "../types/site-review";

const SUMMARY_COLS =
  "id,created_at,created_by,input_email,domain,website_url,business_name,digital_score,score_label,status";

export async function runReview(input: {
  email?: string;
  website?: string;
}): Promise<SiteReview> {
  const { data, error } = await supabase.functions.invoke("site-review", {
    body: { email: input.email?.trim(), website: input.website?.trim() },
  });
  if (error) {
    // functions.invoke wraps non-2xx in a FunctionsHttpError; dig out the real message.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) throw new Error(body.error);
      } catch {
        /* fall through */
      }
    }
    throw new Error(error.message);
  }
  const body = data as { review?: SiteReview; error?: string } | null;
  if (body?.error) throw new Error(body.error);
  if (!body?.review) throw new Error("No review returned.");
  return body.review;
}

export async function listReviews(): Promise<SiteReviewSummary[]> {
  const { data, error } = await supabase
    .from("site_reviews")
    .select(SUMMARY_COLS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SiteReviewSummary[]) ?? [];
}

export async function getReview(id: string): Promise<SiteReview | null> {
  const { data, error } = await supabase
    .from("site_reviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SiteReview | null) ?? null;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("site_reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

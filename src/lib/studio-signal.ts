// Studio-side data access for Signal (content_insights + content_posts).
// Uses the authenticated supabase-js client; admin RLS means an admin reads/writes
// everything and a non-admin session sees nothing. Generation runs server-side via
// the generate-content-drafts edge function. Nothing here publishes anything.

import { supabase } from "./supabase";
import type {
  ContentInsight,
  ContentPost,
  InsightDraft,
  GeneratedDraftSummary,
  PostCtaType,
} from "../types/signal";

const INSIGHT_COLS =
  "id,summary,detail,sector,metric,source_type,source_ref,anonymised,tags,status,created_at";

const POST_COLS =
  "id,insight_id,body,hook,variant_label,cta_type,status,scheduled_for,posted_at,linkedin_url,notes,created_at,updated_at";

// ── Insights ─────────────────────────────────────────────────────────────────

export async function listInsights(): Promise<ContentInsight[]> {
  const { data, error } = await supabase
    .from("content_insights")
    .select(INSIGHT_COLS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ContentInsight[]) ?? [];
}

export async function createInsight(draft: InsightDraft): Promise<ContentInsight> {
  const { data, error } = await supabase
    .from("content_insights")
    .insert(draft)
    .select(INSIGHT_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as ContentInsight;
}

export async function updateInsight(
  id: string,
  patch: Partial<InsightDraft & { status: ContentInsight["status"] }>,
): Promise<ContentInsight> {
  const { data, error } = await supabase
    .from("content_insights")
    .update(patch)
    .eq("id", id)
    .select(INSIGHT_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as ContentInsight;
}

export async function deleteInsight(id: string): Promise<void> {
  const { error } = await supabase.from("content_insights").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function listPosts(): Promise<ContentPost[]> {
  const { data, error } = await supabase
    .from("content_posts")
    .select(POST_COLS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ContentPost[]) ?? [];
}

export async function updatePost(
  id: string,
  patch: Partial<Omit<ContentPost, "id" | "created_at" | "updated_at">>,
): Promise<ContentPost> {
  const { data, error } = await supabase
    .from("content_posts")
    .update(patch)
    .eq("id", id)
    .select(POST_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as ContentPost;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("content_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Generation ───────────────────────────────────────────────────────────────

// Calls the edge function to turn an anonymised insight (or raw text) into draft
// posts. The function enforces the anonymised gate server-side and saves the rows;
// returns a summary of what it created. The session token rides along automatically.
export async function generateDrafts(input: {
  insight_id?: string;
  raw_text?: string;
  variant_count?: number;
  cta_type?: PostCtaType;
}): Promise<GeneratedDraftSummary[]> {
  const { data, error } = await supabase.functions.invoke("generate-content-drafts", {
    body: input,
  });
  if (error) throw new Error(await readInvokeError(error));
  const body = data as { error?: string; posts?: GeneratedDraftSummary[] };
  if (body?.error) throw new Error(body.error);
  return body?.posts ?? [];
}

// functions.invoke wraps non-2xx responses in a FunctionsHttpError whose JSON body
// carries the real message. Mirror of the helpers in studio-clients/-insights.
async function readInvokeError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* fall through */
    }
  }
  return (error as Error).message ?? "Request failed.";
}

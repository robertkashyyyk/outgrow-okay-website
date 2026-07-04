// Studio-side Insights data access. Unlike the public reader (lib/insights.ts, which
// hits the REST API anonymously and only ever sees live posts), this uses the
// authenticated supabase-js client. RLS lets an admin read/write everything; a
// non-admin session sees nothing here. All mutations rely on the admin RLS policies
// added in the insights_admin migration.

import { supabase } from "./supabase";
import type { Insight, InsightDraft, PostStatus } from "../types/insight";

const COLS =
  "id,title,slug,subtitle,excerpt,content,cover_image_url,cta_label,cta_url,tags,status,scheduled_at,published_at,created_at,updated_at";

export async function listInsights(): Promise<Insight[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(COLS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Insight[]) ?? [];
}

export async function getInsight(id: string): Promise<Insight | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Insight | null) ?? null;
}

export async function createInsight(
  draft: Partial<InsightDraft> & { title: string; slug: string },
): Promise<Insight> {
  const { data, error } = await supabase
    .from("blog_posts")
    .insert(draft)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Insight;
}

export async function updateInsight(
  id: string,
  patch: Partial<InsightDraft>,
): Promise<Insight> {
  const { data, error } = await supabase
    .from("blog_posts")
    .update(patch)
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Insight;
}

export async function deleteInsight(id: string): Promise<void> {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Convenience transitions ---------------------------------------------------

/** Publish now: status=published, published_at=now (kept if already set in the past). */
export async function publishInsight(id: string): Promise<Insight> {
  return updateInsight(id, {
    status: "published",
    published_at: new Date().toISOString(),
  });
}

/** Schedule for a future go-live moment. */
export async function scheduleInsight(
  id: string,
  whenISO: string,
): Promise<Insight> {
  return updateInsight(id, { status: "scheduled", scheduled_at: whenISO });
}

/** Flip a scheduled post live immediately (uses its scheduled time as published_at if past). */
export async function goLive(insight: Insight): Promise<Insight> {
  return updateInsight(insight.id, {
    status: "published",
    published_at: new Date().toISOString(),
  });
}

// Slug helper: lowercase, spaces→hyphens, strip non-url-safe chars.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Upload a cover image to the public blog-images bucket; returns the public URL.
export async function uploadCover(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("blog-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}

export function statusCount(posts: Insight[], status: PostStatus): number {
  return posts.filter((p) => p.status === status).length;
}

// AI helpers ----------------------------------------------------------------
// These call admin-gated edge functions (blog-assistant / generate-blog-image).
// The authenticated session token rides along automatically via functions.invoke,
// so the function can confirm the caller is an admin before spending API tokens.

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Conversational writing help. Returns the assistant's reply text. */
export async function assistWrite(messages: ChatMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke("blog-assistant", {
    body: { mode: "assist", messages },
  });
  if (error) throw new Error(await readInvokeError(error));
  if (data?.error) throw new Error(String(data.error));
  return (data?.suggestion as string) ?? "";
}

/** Suggest a handful of tags from the title + excerpt. */
export async function suggestTags(
  title: string,
  excerpt: string,
): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("blog-assistant", {
    body: { mode: "tags", title, excerpt },
  });
  if (error) throw new Error(await readInvokeError(error));
  if (data?.error) throw new Error(String(data.error));
  return (data?.tags as string[]) ?? [];
}

/** Generate a cover image (DALL-E 3, OO aesthetic); returns its public URL. */
export async function generateCover(
  title: string,
  excerpt: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-blog-image", {
    body: { title, excerpt },
  });
  if (error) throw new Error(await readInvokeError(error));
  if (data?.error) throw new Error(String(data.error));
  if (!data?.url) throw new Error("No image URL returned.");
  return data.url as string;
}

// Content Engine: batch generation -----------------------------------------

export type GenerationJob = {
  id: string;
  type: string;
  status: "running" | "complete" | "failed";
  progress: number;
  total: number;
  message: string | null;
  created_at: string;
  updated_at: string;
};

/** The most recent generation job, if any (used to show a progress banner). */
export async function latestJob(): Promise<GenerationJob | null> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("id,type,status,progress,total,message,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GenerationJob | null) ?? null;
}

/**
 * Kick off a background batch. Uses a keepalive fetch with the caller's access
 * token so the request survives navigating away immediately — the edge function
 * runs the pipeline in the background regardless and reports via generation_jobs.
 */
export async function startBatch(opts: {
  theme: string;
  slots: string[];
  previousTitles: string[];
  backfill: boolean;
}): Promise<void> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-blog-batch`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(opts),
    keepalive: true,
  });
}

// functions.invoke wraps non-2xx responses in a FunctionsHttpError whose body is
// the Response; pull the JSON message out for a useful error.
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

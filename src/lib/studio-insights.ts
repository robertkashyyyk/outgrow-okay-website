// Studio-side Insights data access. Unlike the public reader (lib/insights.ts, which
// hits the REST API anonymously and only ever sees live posts), this uses the
// authenticated supabase-js client. RLS lets an admin read/write everything; a
// non-admin session sees nothing here. All mutations rely on the admin RLS policies
// added in the insights_admin migration.

import { supabase } from "./supabase";
import type { Insight, InsightDraft, PostStatus } from "../types/insight";

const COLS =
  "id,title,slug,subtitle,excerpt,content,cover_image_url,tags,status,scheduled_at,published_at,created_at,updated_at";

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

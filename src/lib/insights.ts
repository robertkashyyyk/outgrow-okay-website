// Insights data access. Outgrow Okay has no @supabase/supabase-js client — like the
// booking flow, we hit the Supabase REST API directly with fetch + the anon key.
// The blog_posts table's only RLS policy is public-read of LIVE published posts, so
// the anon key can only ever see what's meant to be public; drafts/scheduled stay hidden.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const REST = `${SUPABASE_URL}/rest/v1/blog_posts`;
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

// Card / index view — no body, keeps the list payload small.
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  tags: string[];
  published_at: string | null;
}

// Full article view.
export interface Post extends PostSummary {
  content: string;
  cover_image_url: string | null;
}

const SUMMARY_COLS = "id,title,slug,subtitle,excerpt,tags,published_at";
const FULL_COLS = `${SUMMARY_COLS},content,cover_image_url`;

export async function fetchPublishedPosts(): Promise<PostSummary[]> {
  const url = `${REST}?select=${SUMMARY_COLS}&order=published_at.desc`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to load insights (${res.status})`);
  return (await res.json()) as PostSummary[];
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const url = `${REST}?select=${FULL_COLS}&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to load insight (${res.status})`);
  const rows = (await res.json()) as Post[];
  return rows[0] ?? null;
}

export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, ExternalLink, Trash2, Rocket } from "lucide-react";
import {
  listInsights,
  deleteInsight,
  goLive,
} from "../../../lib/studio-insights";
import { formatPostDate } from "../../../lib/insights";
import { STATUS_LABEL, type Insight, type PostStatus } from "../../../types/insight";

type Tab = "all" | PostStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft", label: "Drafts" },
  { id: "pending_review", label: "Pending" },
];

const STATUS_COLOR: Record<PostStatus, string> = {
  published: "var(--oo-pos)",
  scheduled: "var(--oo-warn)",
  pending_review: "var(--oo-grey-500)",
  draft: "var(--oo-grey-400)",
};

function StatusTag({ status }: { status: PostStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="num inline-flex items-center gap-2 text-xs uppercase tracking-wide"
      style={{ color }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function InsightsList() {
  const [posts, setPosts] = useState<Insight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listInsights();
        if (active) setPosts(data);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: posts?.length ?? 0,
      published: 0,
      scheduled: 0,
      draft: 0,
      pending_review: 0,
    };
    posts?.forEach((p) => (c[p.status] += 1));
    return c;
  }, [posts]);

  const visible = useMemo(() => {
    if (!posts) return [];
    return tab === "all" ? posts : posts.filter((p) => p.status === tab);
  }, [posts, tab]);

  async function onDelete(id: string) {
    setBusyId(id);
    try {
      await deleteInsight(id);
      setPosts((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  async function onGoLive(post: Insight) {
    setBusyId(post.id);
    try {
      const updated = await goLive(post);
      setPosts((prev) => prev?.map((p) => (p.id === post.id ? updated : p)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Studio · Insights</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Insights
          </h1>
        </div>
        <Link
          to="/studio/insights/new"
          className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 shrink-0"
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          New insight
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mt-7 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-4 py-2 text-sm transition-colors duration-fast border-b-2 -mb-px " +
              (tab === t.id
                ? "border-content text-content font-semibold"
                : "border-transparent text-muted hover:text-content")
            }
          >
            {t.label}
            <span className="num ml-2 text-xs text-faint">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      {/* List */}
      <div className="mt-5">
        {posts === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {visible.map((post) => (
              <li
                key={post.id}
                className="flex items-center gap-4 py-4"
              >
                <div className="h-12 w-16 shrink-0 rounded border border-line overflow-hidden bg-surface">
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-base text-content truncate">{post.title}</p>
                  <p className="num text-xs text-faint truncate">/{post.slug}</p>
                </div>

                <div className="hidden sm:block w-32 shrink-0">
                  <StatusTag status={post.status} />
                </div>

                <div className="hidden md:block w-28 shrink-0 num text-xs text-faint">
                  {formatPostDate(post.published_at ?? post.scheduled_at)}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {post.status === "scheduled" && (
                    <button
                      onClick={() => onGoLive(post)}
                      disabled={busyId === post.id}
                      title="Publish now"
                      className="p-2 rounded text-muted hover:text-content transition-colors duration-fast disabled:opacity-50"
                    >
                      <Rocket size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                  )}
                  <Link
                    to={`/studio/insights/${post.id}/edit`}
                    title="Edit"
                    className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
                  >
                    <Pencil size={16} strokeWidth={1.5} aria-hidden />
                  </Link>
                  {post.status === "published" && (
                    <a
                      href={`/insights/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View live"
                      className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
                    >
                      <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
                    </a>
                  )}
                  {confirmId === post.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => onDelete(post.id)}
                        disabled={busyId === post.id}
                        className="num text-xs uppercase tracking-wide px-2 py-1 rounded disabled:opacity-50"
                        style={{ color: "var(--oo-neg)" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmId(post.id)}
                      title="Delete"
                      className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
                    >
                      <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

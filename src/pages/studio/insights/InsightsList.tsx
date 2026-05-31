import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, ExternalLink, Trash2, Rocket, Wand2, Loader2 } from "lucide-react";
import {
  listInsights,
  deleteInsight,
  goLive,
  latestJob,
  type GenerationJob,
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
  const [job, setJob] = useState<GenerationJob | null>(null);
  const wasRunning = useRef(false);

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

  // Poll the latest generation job; when one finishes, refresh the list.
  useEffect(() => {
    let active = true;
    async function tick() {
      try {
        const j = await latestJob();
        if (!active) return;
        setJob(j);
        if (j?.status === "running") {
          wasRunning.current = true;
        } else if (wasRunning.current) {
          // A job we were watching just finished — reload posts once.
          wasRunning.current = false;
          listInsights().then((data) => active && setPosts(data)).catch(() => {});
        }
      } catch {
        /* polling is best-effort */
      }
    }
    void tick();
    const id = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(id);
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
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/studio/insights/engine"
            className="inline-flex items-center gap-2 border border-line bg-surface px-5 py-3 font-heading font-bold text-base text-content rounded-md transition-colors duration-fast hover:border-content"
          >
            <Wand2 size={18} strokeWidth={1.5} aria-hidden />
            Content engine
          </Link>
          <Link
            to="/studio/insights/new"
            className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105"
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            New insight
          </Link>
        </div>
      </div>

      {/* Generation job progress */}
      {job && job.status === "running" && (
        <div className="mt-6 flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
          <Loader2 size={16} className="motion-safe:animate-spin text-muted shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-content truncate">
              {job.message ?? "Generating…"}
            </p>
            {job.total > 0 && (
              <div className="mt-2 h-1 w-full rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-fast"
                  style={{ width: `${Math.min(100, Math.round((job.progress / job.total) * 100))}%` }}
                />
              </div>
            )}
          </div>
          <span className="num text-xs text-faint shrink-0">
            {job.progress}/{job.total}
          </span>
        </div>
      )}
      {job && job.status === "failed" && (
        <div
          className="mt-6 rounded-md border border-line px-4 py-3 text-sm"
          style={{ color: "var(--oo-neg)" }}
        >
          Last generation failed: {job.message ?? "unknown error"}
        </div>
      )}

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

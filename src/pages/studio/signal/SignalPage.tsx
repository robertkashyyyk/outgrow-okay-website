import { useEffect, useMemo, useState } from "react";
import {
  listInsights,
  listPosts,
  createInsight,
  updateInsight,
  deleteInsight,
  updatePost,
  deletePost,
  generateDrafts,
} from "../../../lib/studio-signal";
import type {
  ContentInsight,
  ContentPost,
  InsightDraft,
  PostCtaType,
  PostStatus,
} from "../../../types/signal";
import { InsightBank } from "./InsightBank";
import { EditorialBoard } from "./EditorialBoard";
import type { PostPatch } from "./PostEditor";

// Current month prefix (YYYY-MM) for the "posted this month" tile. Computed at module
// scope so the purity lint stays happy (no no-arg Date during render).
const MONTH_PREFIX = new Date().toISOString().slice(0, 7);

type Tab = "bank" | "board";
const TABS: { id: Tab; label: string }[] = [
  { id: "bank", label: "Insight bank" },
  { id: "board", label: "Editorial board" },
];

export function SignalPage() {
  const [insights, setInsights] = useState<ContentInsight[] | null>(null);
  const [posts, setPosts] = useState<ContentPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("bank");

  const [busyId, setBusyId] = useState<string | null>(null); // insight/post id or "new"
  const [genId, setGenId] = useState<string | null>(null); // insight currently generating

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ins, ps] = await Promise.all([listInsights(), listPosts()]);
        if (active) {
          setInsights(ins);
          setPosts(ps);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const p = posts ?? [];
    return {
      awaitingReview: p.filter((x) => x.status === "in_review").length,
      approved: p.filter((x) => x.status === "approved").length,
      postedThisMonth: p.filter(
        (x) => x.status === "posted" && (x.posted_at ?? "").startsWith(MONTH_PREFIX),
      ).length,
      bank: (insights ?? []).filter((x) => x.status !== "archived").length,
    };
  }, [posts, insights]);

  // ── Insight mutations ──────────────────────────────────────────────────────
  async function withBusy(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onAddInsight(draft: InsightDraft) {
    await withBusy("new", async () => {
      await createInsight(draft);
      setInsights(await listInsights());
    });
  }

  async function onEditInsight(id: string, draft: InsightDraft) {
    await withBusy(id, async () => {
      await updateInsight(id, draft);
      setInsights(await listInsights());
    });
  }

  async function onDeleteInsight(id: string) {
    await withBusy(id, async () => {
      await deleteInsight(id);
      setInsights(await listInsights());
    });
  }

  async function onGenerate(
    insight: ContentInsight,
    variantCount: number,
    ctaType: PostCtaType,
  ) {
    setGenId(insight.id);
    setError(null);
    setNotice(null);
    try {
      const made = await generateDrafts({
        insight_id: insight.id,
        variant_count: variantCount,
        cta_type: ctaType,
      });
      const [ins, ps] = await Promise.all([listInsights(), listPosts()]);
      setInsights(ins);
      setPosts(ps);
      setNotice(
        `Generated ${made.length} draft${made.length === 1 ? "" : "s"}. They're on the editorial board.`,
      );
      setTab("board");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenId(null);
    }
  }

  // ── Post mutations ─────────────────────────────────────────────────────────
  async function onPostStatusChange(id: string, status: PostStatus) {
    await withBusy(id, async () => {
      // Dragging into Posted records the time so the monthly tile is accurate; the
      // explicit "Mark as posted" action also captures the URL.
      const patch: Partial<ContentPost> =
        status === "posted"
          ? { status, posted_at: new Date().toISOString() }
          : { status };
      await updatePost(id, patch);
      setPosts(await listPosts());
    });
  }

  async function onPostSave(id: string, patch: PostPatch) {
    await withBusy(id, async () => {
      await updatePost(id, patch);
      setPosts(await listPosts());
    });
  }

  async function onMarkPosted(id: string, linkedinUrl: string) {
    await withBusy(id, async () => {
      await updatePost(id, {
        status: "posted",
        posted_at: new Date().toISOString(),
        linkedin_url: linkedinUrl || null,
      });
      setPosts(await listPosts());
    });
  }

  async function onArchivePost(id: string) {
    await withBusy(id, async () => {
      await updatePost(id, { status: "archived" });
      setPosts(await listPosts());
    });
  }

  async function onDeletePost(id: string) {
    await withBusy(id, async () => {
      await deletePost(id);
      setPosts(await listPosts());
    });
  }

  return (
    <div className="max-w-content">
      <div>
        <p className="eyebrow">Studio · Signal</p>
        <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
          Signal
        </h1>
        <p className="mt-2 text-sm text-muted max-w-prose">
          Turn anonymised findings from real work into LinkedIn posts. You approve and
          post every one yourself — nothing here publishes automatically.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Awaiting review" value={stats.awaitingReview} />
        <StatTile label="Approved & ready" value={stats.approved} />
        <StatTile label="Posted this month" value={stats.postedThisMonth} />
        <StatTile label="Insights in bank" value={stats.bank} />
      </div>

      {/* Tabs */}
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
            <span className="num ml-2 text-xs text-faint">
              {t.id === "bank" ? (insights?.length ?? 0) : (posts?.length ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {notice && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-pos)" }}>
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      <div className="mt-6">
        {tab === "bank" ? (
          <InsightBank
            insights={insights}
            busyId={busyId}
            genId={genId}
            onAdd={onAddInsight}
            onEditSave={onEditInsight}
            onDelete={onDeleteInsight}
            onGenerate={onGenerate}
          />
        ) : (
          <EditorialBoard
            posts={posts}
            busyId={busyId}
            onStatusChange={onPostStatusChange}
            onSave={onPostSave}
            onMarkPosted={onMarkPosted}
            onArchive={onArchivePost}
            onDelete={onDeletePost}
          />
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3">
      <p className="num text-2xl text-content">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

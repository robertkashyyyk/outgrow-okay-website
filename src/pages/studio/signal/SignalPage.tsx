import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  listInsights,
  listPosts,
  createInsight,
  updateInsight,
  deleteInsight,
  generateDrafts,
} from "../../../lib/studio-signal";
import {
  INSIGHT_SOURCES,
  INSIGHT_SOURCE_LABEL,
  INSIGHT_STATUS_LABEL,
  POST_CTAS,
  POST_CTA_LABEL,
  type ContentInsight,
  type ContentPost,
  type InsightDraft,
  type InsightSourceType,
  type InsightStatus,
  type PostCtaType,
} from "../../../types/signal";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-xs text-muted mb-1.5 num uppercase tracking-wide";

// Current month prefix (YYYY-MM) for the "posted this month" tile. Computed at module
// scope so the purity lint stays happy (no no-arg Date during render).
const MONTH_PREFIX = new Date().toISOString().slice(0, 7);

// Insight status shown as a neutral/semantic dot — accent is reserved for CTAs only.
const INSIGHT_STATUS_COLOR: Record<InsightStatus, string> = {
  raw: "var(--oo-grey-400)",
  used: "var(--oo-pos)",
  archived: "var(--oo-grey-400)",
};

export function SignalPage() {
  const [insights, setInsights] = useState<ContentInsight[] | null>(null);
  const [posts, setPosts] = useState<ContentPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // insight id or "new"
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

  async function refreshInsights() {
    setInsights(await listInsights());
  }

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

  async function onAdd(draft: InsightDraft) {
    setBusyId("new");
    setError(null);
    try {
      await createInsight(draft);
      await refreshInsights();
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onEditSave(id: string, draft: InsightDraft) {
    setBusyId(id);
    setError(null);
    try {
      await updateInsight(id, draft);
      await refreshInsights();
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteInsight(id);
      await refreshInsights();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
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
      // Insight flips to "used" server-side and posts land on the board.
      const [ins, ps] = await Promise.all([listInsights(), listPosts()]);
      setInsights(ins);
      setPosts(ps);
      setNotice(
        `Generated ${made.length} draft${made.length === 1 ? "" : "s"} — find them on the editorial board.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenId(null);
    }
  }

  return (
    <div className="max-w-content">
      <div className="flex items-start justify-between gap-4">
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
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 shrink-0"
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            New insight
          </button>
        )}
      </div>

      {/* Stat tiles */}
      <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Awaiting review" value={stats.awaitingReview} />
        <StatTile label="Approved & ready" value={stats.approved} />
        <StatTile label="Posted this month" value={stats.postedThisMonth} />
        <StatTile label="Insights in bank" value={stats.bank} />
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

      {adding && (
        <div className="mt-6">
          <InsightForm
            onSave={onAdd}
            onCancel={() => setAdding(false)}
            busy={busyId === "new"}
          />
        </div>
      )}

      <h2 className="mt-8 num text-xs uppercase tracking-wide text-muted">
        Insight bank
      </h2>

      <div className="mt-4">
        {insights === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (insights ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            No insights yet. Add the first finding from a client or call.
          </p>
        ) : (
          <ul className="space-y-3">
            {(insights ?? []).map((insight) =>
              editingId === insight.id ? (
                <li key={insight.id}>
                  <InsightForm
                    initial={insight}
                    onSave={(d) => onEditSave(insight.id, d)}
                    onCancel={() => setEditingId(null)}
                    busy={busyId === insight.id}
                  />
                </li>
              ) : (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  busy={busyId === insight.id}
                  generating={genId === insight.id}
                  onEdit={() => {
                    setEditingId(insight.id);
                    setAdding(false);
                  }}
                  onDelete={() => onDelete(insight.id)}
                  onGenerate={(count, cta) => onGenerate(insight, count, cta)}
                />
              ),
            )}
          </ul>
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

function InsightCard({
  insight,
  busy,
  generating,
  onEdit,
  onDelete,
  onGenerate,
}: {
  insight: ContentInsight;
  busy: boolean;
  generating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onGenerate: (variantCount: number, ctaType: PostCtaType) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [variantCount, setVariantCount] = useState(3);
  const [ctaType, setCtaType] = useState<PostCtaType>("none");

  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base text-content">{insight.summary}</p>
          {insight.detail && (
            <p className="mt-1.5 text-sm text-muted leading-relaxed">{insight.detail}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-faint">
            <span
              className="num inline-flex items-center gap-1.5 uppercase tracking-wide"
              style={{ color: INSIGHT_STATUS_COLOR[insight.status] }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: INSIGHT_STATUS_COLOR[insight.status] }}
              />
              {INSIGHT_STATUS_LABEL[insight.status]}
            </span>
            <span className="num uppercase tracking-wide">
              {INSIGHT_SOURCE_LABEL[insight.source_type]}
            </span>
            {insight.sector && <span>{insight.sector}</span>}
            {insight.metric && <span className="num">{insight.metric}</span>}
            {/* Anonymised state — explicit and unmissable, since it gates generation. */}
            {insight.anonymised ? (
              <span
                className="inline-flex items-center gap-1"
                style={{ color: "var(--oo-pos)" }}
              >
                <ShieldCheck size={13} strokeWidth={1.5} aria-hidden />
                Anonymised
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1"
                style={{ color: "var(--oo-warn)" }}
              >
                <ShieldAlert size={13} strokeWidth={1.5} aria-hidden />
                Not anonymised
              </span>
            )}
          </div>
          {insight.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {insight.tags.map((t) => (
                <span
                  key={t}
                  className="num text-xs text-muted border border-line rounded px-1.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            title="Edit"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
          >
            <Pencil size={15} strokeWidth={1.5} aria-hidden />
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button
                onClick={onDelete}
                disabled={busy}
                className="num text-xs uppercase tracking-wide px-2 py-1 rounded disabled:opacity-50"
                style={{ color: "var(--oo-neg)" }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
            >
              <Trash2 size={15} strokeWidth={1.5} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Generate controls — disabled unless anonymised (mirrors the server gate). */}
      <div className="mt-4 border-t border-line pt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className={LABEL}>Variants</label>
          <select
            value={variantCount}
            onChange={(e) => setVariantCount(Number(e.target.value))}
            disabled={!insight.anonymised || generating}
            className={`${FIELD} w-20`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Call to action</label>
          <select
            value={ctaType}
            onChange={(e) => setCtaType(e.target.value as PostCtaType)}
            disabled={!insight.anonymised || generating}
            className={`${FIELD} w-40`}
          >
            {POST_CTAS.map((c) => (
              <option key={c} value={c}>
                {POST_CTA_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => onGenerate(variantCount, ctaType)}
          disabled={!insight.anonymised || generating}
          title={
            insight.anonymised
              ? "Generate LinkedIn drafts from this insight"
              : "Mark this insight anonymised before generating"
          }
          className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden />
          ) : (
            <Sparkles size={15} strokeWidth={2} aria-hidden />
          )}
          Generate posts
        </button>
        {!insight.anonymised && (
          <span className="text-xs text-faint">
            Only anonymised insights can be turned into posts.
          </span>
        )}
      </div>
    </li>
  );
}

function InsightForm({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial?: ContentInsight;
  onSave: (draft: InsightDraft) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [sector, setSector] = useState(initial?.sector ?? "");
  const [metric, setMetric] = useState(initial?.metric ?? "");
  const [sourceType, setSourceType] = useState<InsightSourceType>(
    initial?.source_type ?? "manual",
  );
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [anonymised, setAnonymised] = useState(initial?.anonymised ?? false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    onSave({
      summary: summary.trim(),
      detail: detail.trim() || null,
      sector: sector.trim() || null,
      metric: metric.trim() || null,
      source_type: sourceType,
      source_ref: initial?.source_ref ?? null,
      anonymised,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4 space-y-3"
    >
      <div>
        <label className={LABEL}>The finding</label>
        <textarea
          placeholder="What did you observe? Keep it anonymised — no client names or identifying detail."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className={`${FIELD} resize-y leading-relaxed`}
          autoFocus
        />
      </div>

      <div>
        <label className={LABEL}>Detail</label>
        <textarea
          placeholder="Optional — extra context, the before/after, what you actually did."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Sector</label>
          <input
            placeholder="e.g. professional services"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Metric / result</label>
          <input
            placeholder="e.g. ~6 hrs/week recovered"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Source</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as InsightSourceType)}
            className={FIELD}
          >
            {INSIGHT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {INSIGHT_SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Tags</label>
          <input
            placeholder="comma, separated"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      {/* Anonymised toggle — explicit, because it gates generation. */}
      <label className="flex items-start gap-2.5 rounded-md border border-line bg-ground px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={anonymised}
          onChange={(e) => setAnonymised(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--oo-pos)]"
        />
        <span className="text-sm text-content">
          This is anonymised
          <span className="block text-xs text-muted mt-0.5">
            No client name, no identifying detail. Only anonymised insights can be turned
            into posts.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !summary.trim()}
          className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
          Save insight
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="num text-xs uppercase tracking-wide px-3 py-2 text-faint hover:text-content"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, Sparkles, Tags, Wand2, X } from "lucide-react";
import {
  getInsight,
  createInsight,
  updateInsight,
  uploadCover,
  slugify,
  assistWrite,
  suggestTags,
  generateCover,
  type ChatMessage,
} from "../../../lib/studio-insights";
import { STATUS_LABEL, type PostStatus } from "../../../types/insight";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-sm text-muted mb-2";

// datetime-local <-> ISO helpers. The input is wall-clock local; we store UTC ISO.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
function localInputToIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

export function InsightEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const slugTouched = useRef(false);
  const [tags, setTags] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<PostStatus>("draft");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  // AI helpers
  const [genCover, setGenCover] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistPrompt, setAssistPrompt] = useState("");
  const [assistReply, setAssistReply] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let active = true;
    (async () => {
      try {
        const post = await getInsight(id);
        if (!active) return;
        if (!post) {
          setError("That insight no longer exists.");
          return;
        }
        slugTouched.current = true;
        setTitle(post.title);
        setSubtitle(post.subtitle ?? "");
        setSlug(post.slug);
        setTags(post.tags.join(", "));
        setExcerpt(post.excerpt ?? "");
        setContent(post.content);
        setStatus(post.status);
        setScheduledLocal(isoToLocalInput(post.scheduled_at));
        setPublishedAt(post.published_at);
        setCoverUrl(post.cover_image_url);
        setCtaLabel(post.cta_label ?? "");
        setCtaUrl(post.cta_url ?? "");
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched.current) setSlug(slugify(value));
  }

  function parsedTags(): string[] {
    return tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadCover(file);
      setCoverUrl(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onGenerateCover() {
    if (!title.trim()) {
      setError("Add a title first — the cover is generated from it.");
      return;
    }
    setGenCover(true);
    setError(null);
    try {
      const url = await generateCover(title.trim(), excerpt.trim());
      setCoverUrl(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenCover(false);
    }
  }

  async function onSuggestTags() {
    if (!title.trim()) {
      setError("Add a title first — tags are suggested from it.");
      return;
    }
    setTagBusy(true);
    setError(null);
    try {
      const suggested = await suggestTags(title.trim(), excerpt.trim());
      // Merge with any existing tags, de-duped, preserving order.
      const merged = Array.from(new Set([...parsedTags(), ...suggested]));
      setTags(merged.join(", "));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTagBusy(false);
    }
  }

  async function onAssist() {
    if (!assistPrompt.trim()) return;
    setAssistBusy(true);
    setError(null);
    try {
      // Give the assistant the current draft as context, then the instruction.
      const history: ChatMessage[] = [];
      if (content.trim()) {
        history.push({
          role: "user",
          content: `Here is the current draft of the post (Markdown):\n\n${content}`,
        });
        history.push({
          role: "assistant",
          content: "Got it — I've read the draft. What would you like me to do?",
        });
      }
      history.push({ role: "user", content: assistPrompt.trim() });
      const reply = await assistWrite(history);
      setAssistReply(reply);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssistBusy(false);
    }
  }

  // Persist. `publish` overrides the status select to publish-now.
  async function save(publish: boolean) {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    setBusy(true);
    setError(null);

    const nextStatus: PostStatus = publish ? "published" : status;
    // A published post always carries a date: keep the one set in the editor,
    // otherwise stamp now. Non-published statuses keep whatever's there.
    const nextPublishedAt =
      nextStatus === "published"
        ? publishedAt ?? new Date().toISOString()
        : publishedAt;

    const draft = {
      title: title.trim(),
      slug: (slug || slugify(title)).trim(),
      subtitle: subtitle.trim() || null,
      excerpt: excerpt.trim() || null,
      content,
      cover_image_url: coverUrl,
      cta_label: ctaLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
      tags: parsedTags(),
      status: nextStatus,
      scheduled_at:
        nextStatus === "scheduled" ? localInputToIso(scheduledLocal) : null,
      published_at: nextPublishedAt,
    };

    try {
      if (isEdit && id) {
        await updateInsight(id, draft);
        if (publish) setStatus("published");
        navigate("/studio/insights");
      } else {
        const created = await createInsight(draft);
        navigate(`/studio/insights/${created.id}/edit`, { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save(false);
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="max-w-prose">
      <Link
        to="/studio/insights"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        All insights
      </Link>

      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        {isEdit ? "Edit insight" : "New insight"}
      </h1>

      <form onSubmit={onSubmit} className="mt-7 space-y-5">
        {/* Cover */}
        <div>
          <span className={LABEL}>Cover image</span>
          <div className="relative h-44 rounded-lg border border-line overflow-hidden bg-surface">
            {coverUrl ? (
              <>
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  title="Remove cover"
                  className="absolute top-2 right-2 p-1.5 rounded bg-ink/70 text-bone hover:bg-ink transition-colors duration-fast"
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted hover:text-content transition-colors duration-fast"
              >
                {uploading ? (
                  <Loader2
                    size={22}
                    className="motion-safe:animate-spin"
                    aria-hidden
                  />
                ) : (
                  <ImagePlus size={22} strokeWidth={1.5} aria-hidden />
                )}
                <span className="text-sm">
                  {uploading ? "Uploading…" : "Upload a cover"}
                </span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickCover}
            className="hidden"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || genCover}
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast disabled:opacity-60"
            >
              <ImagePlus size={15} strokeWidth={1.5} aria-hidden />
              Upload
            </button>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <button
              type="button"
              onClick={() => void onGenerateCover()}
              disabled={uploading || genCover}
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast disabled:opacity-60"
            >
              {genCover ? (
                <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden />
              ) : (
                <Wand2 size={15} strokeWidth={1.5} aria-hidden />
              )}
              {genCover ? "Generating…" : "Generate with AI"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="title" className={LABEL}>
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="subtitle" className={LABEL}>
            Subtitle <span className="text-faint">(optional)</span>
          </label>
          <input
            id="subtitle"
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="slug" className={LABEL}>
            URL slug
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              slugTouched.current = true;
              setSlug(e.target.value);
            }}
            className={`${FIELD} num`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="tags" className={LABEL}>
              Tags <span className="text-faint">(comma-separated)</span>
            </label>
            <button
              type="button"
              onClick={() => void onSuggestTags()}
              disabled={tagBusy}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content transition-colors duration-fast disabled:opacity-60 mb-2"
            >
              {tagBusy ? (
                <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />
              ) : (
                <Tags size={14} strokeWidth={1.5} aria-hidden />
              )}
              {tagBusy ? "Suggesting…" : "Suggest"}
            </button>
          </div>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="excerpt" className={LABEL}>
            Excerpt
          </label>
          <textarea
            id="excerpt"
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className={`${FIELD} resize-y`}
          />
        </div>

        {/* Optional call-to-action button, rendered at the foot of the article. */}
        <div>
          <span className={LABEL}>
            Call to action <span className="text-faint">(optional)</span>
          </span>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Button text — e.g. Get a free review"
              className={FIELD}
            />
            <input
              type="text"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="Link — e.g. /review or https://…"
              className={`${FIELD} num`}
            />
          </div>
          <p className="mt-1.5 text-xs text-faint">
            Shows a button under the post only when both are filled in. Use a site path
            like <span className="num">/review</span> for an internal link.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className={LABEL}>
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className={FIELD}
            >
              {(Object.keys(STATUS_LABEL) as PostStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          {status === "scheduled" && (
            <div>
              <label htmlFor="scheduled" className={LABEL}>
                Go live at
              </label>
              <input
                id="scheduled"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className={FIELD}
              />
            </div>
          )}
          {status === "published" && (
            <div>
              <label htmlFor="published" className={LABEL}>
                Published date
              </label>
              <input
                id="published"
                type="datetime-local"
                value={isoToLocalInput(publishedAt)}
                onChange={(e) => setPublishedAt(localInputToIso(e.target.value))}
                className={FIELD}
              />
              <p className="mt-1.5 text-xs text-faint">
                Shown as the post date on the live page.
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="content" className={LABEL}>
              Content <span className="text-faint">(Markdown)</span>
            </label>
            <button
              type="button"
              onClick={() => setAssistOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content transition-colors duration-fast mb-2"
            >
              <Sparkles size={14} strokeWidth={1.5} aria-hidden />
              Writing assistant
            </button>
          </div>
          <textarea
            id="content"
            rows={22}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${FIELD} font-mono text-sm leading-relaxed resize-y`}
          />

          {assistOpen && (
            <div className="mt-3 rounded-lg border border-line bg-surface p-4">
              <p className="text-sm text-muted">
                Ask for a draft, an intro, a tighter rewrite — the assistant sees
                the current content as context.
              </p>
              <textarea
                rows={3}
                value={assistPrompt}
                onChange={(e) => setAssistPrompt(e.target.value)}
                placeholder="e.g. Draft an opening that frames the bottleneck problem"
                className={`${FIELD} mt-3 resize-y`}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void onAssist()}
                  disabled={assistBusy || !assistPrompt.trim()}
                  className="inline-flex items-center gap-2 border border-line bg-ground px-4 py-2 font-heading font-bold text-sm text-content rounded-md transition-colors duration-fast hover:border-content disabled:opacity-60"
                >
                  {assistBusy ? (
                    <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden />
                  ) : (
                    <Sparkles size={15} strokeWidth={1.5} aria-hidden />
                  )}
                  {assistBusy ? "Thinking…" : "Ask"}
                </button>
              </div>

              {assistReply && (
                <div className="mt-4 border-t border-line pt-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-content">
                    {assistReply}
                  </pre>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setContent((c) => (c ? `${c}\n\n${assistReply}` : assistReply))
                      }
                      className="text-sm text-muted hover:text-content transition-colors duration-fast"
                    >
                      Append to content
                    </button>
                    <span aria-hidden className="text-faint">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => setContent(assistReply)}
                      className="text-sm text-muted hover:text-content transition-colors duration-fast"
                    >
                      Replace content
                    </button>
                    <span aria-hidden className="text-faint">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssistReply("")}
                      className="text-sm text-muted hover:text-content transition-colors duration-fast"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={busy || uploading}
            className="inline-flex items-center justify-center border border-line bg-surface px-6 py-3 font-heading font-bold text-base text-content rounded-md transition-colors duration-fast hover:border-content disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={busy || uploading}
            className="inline-flex items-center justify-center bg-accent px-6 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
          >
            Publish now
          </button>
        </div>
      </form>
    </div>
  );
}

import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Copy, Check, Link as LinkIcon } from "lucide-react";
import {
  POST_CTAS,
  POST_CTA_LABEL,
  type ContentPost,
  type PostCtaType,
} from "../../../types/signal";
import {
  LINKEDIN_FOLD,
  splitAtFold,
  toLinkedInPlaintext,
  buildCtaUrl,
  copyText,
  isoToLocalInput,
  localInputToIso,
} from "../../../lib/linkedin";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-xs text-muted mb-1.5 num uppercase tracking-wide";

export interface PostPatch {
  body: string;
  cta_type: PostCtaType;
  scheduled_for: string | null;
  notes: string | null;
}

// Edit a single post with a live LinkedIn-style preview. The preview dims everything
// after the ~210-char fold so the founder can see whether the hook earns the click.
export function PostEditor({
  post,
  onSave,
  onCancel,
  busy,
}: {
  post: ContentPost;
  onSave: (patch: PostPatch) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [body, setBody] = useState(post.body);
  const [ctaType, setCtaType] = useState<PostCtaType>(post.cta_type);
  const [scheduledLocal, setScheduledLocal] = useState(
    isoToLocalInput(post.scheduled_for),
  );
  const [notes, setNotes] = useState(post.notes ?? "");
  const [copied, setCopied] = useState<"post" | "cta" | null>(null);

  const { head, tail } = useMemo(() => splitAtFold(body), [body]);
  const ctaUrl = buildCtaUrl(post.id, ctaType);

  async function doCopy(kind: "post" | "cta", text: string) {
    try {
      await copyText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onSave({
      body: body.trim(),
      cta_type: ctaType,
      scheduled_for: localInputToIso(scheduledLocal),
      notes: notes.trim() || null,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4 grid grid-cols-1 lg:grid-cols-2 gap-5"
    >
      {/* ── Edit column ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {post.variant_label && (
          <p className="num text-xs uppercase tracking-wide text-faint">
            {post.variant_label}
          </p>
        )}
        <div>
          <label className={LABEL}>Post</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className={`${FIELD} resize-y leading-relaxed`}
            autoFocus
          />
          <p className="mt-1 num text-xs text-faint">
            {body.length} chars · first {LINKEDIN_FOLD} show before “…more”
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Call to action</label>
            <select
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value as PostCtaType)}
              className={FIELD}
            >
              {POST_CTAS.map((c) => (
                <option key={c} value={c}>
                  {POST_CTA_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Schedule for</label>
            <input
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              className={FIELD}
            />
            <p className="mt-1 text-xs text-faint">Planning only — nothing auto-posts.</p>
          </div>
        </div>

        <div>
          <label className={LABEL}>Notes</label>
          <textarea
            placeholder="Private notes — not part of the post."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
            Save
          </button>
          <button
            type="button"
            onClick={() => void doCopy("post", toLinkedInPlaintext(body))}
            className="inline-flex items-center gap-2 border border-line rounded-md px-3 py-2 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast"
          >
            {copied === "post" ? (
              <Check size={14} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
            ) : (
              <Copy size={14} strokeWidth={1.5} aria-hidden />
            )}
            {copied === "post" ? "Copied" : "Copy for LinkedIn"}
          </button>
          {ctaUrl && (
            <button
              type="button"
              onClick={() => void doCopy("cta", ctaUrl)}
              title={ctaUrl}
              className="inline-flex items-center gap-2 border border-line rounded-md px-3 py-2 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast"
            >
              {copied === "cta" ? (
                <Check size={14} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
              ) : (
                <LinkIcon size={14} strokeWidth={1.5} aria-hidden />
              )}
              {copied === "cta" ? "Copied" : "Copy CTA link"}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="num text-xs uppercase tracking-wide px-3 py-2 text-faint hover:text-content"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ── Preview column ──────────────────────────────────────────── */}
      <div>
        <label className={LABEL}>LinkedIn preview</label>
        <div className="rounded-md border border-line bg-ground p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            <span className="text-content">{head}</span>
            {tail && (
              <>
                <span className="text-muted">…more</span>
                <span className="text-faint">{tail}</span>
              </>
            )}
          </p>
        </div>
        <p className="mt-2 text-xs text-faint">
          Dimmed text and “…more” mark what LinkedIn hides until someone taps to expand.
          Make the first line earn it.
        </p>
      </div>
    </form>
  );
}

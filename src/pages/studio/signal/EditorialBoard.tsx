import { useMemo, useState, type DragEvent } from "react";
import {
  Pencil,
  Copy,
  Check,
  Trash2,
  Archive,
  CheckCircle2,
  CalendarClock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  POST_PIPELINE,
  POST_STATUS_LABEL,
  POST_CTA_LABEL,
  type ContentPost,
  type PostStatus,
} from "../../../types/signal";
import { toLinkedInPlaintext, copyText } from "../../../lib/linkedin";
import { PostEditor, type PostPatch } from "./PostEditor";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstLine(body: string): string {
  return body.split("\n")[0];
}

// The editorial board: drafts move left-to-right through the pipeline by dragging
// between columns. Card actions cover the rest (edit, copy, mark posted, archive,
// delete). Nothing here publishes — "Mark as posted" only records what the founder
// already did by hand on LinkedIn.
export function EditorialBoard({
  posts,
  busyId,
  onStatusChange,
  onSave,
  onMarkPosted,
  onArchive,
  onDelete,
}: {
  posts: ContentPost[] | null;
  busyId: string | null;
  onStatusChange: (id: string, status: PostStatus) => void;
  onSave: (id: string, patch: PostPatch) => void;
  onMarkPosted: (id: string, linkedinUrl: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<PostStatus | null>(null);

  const columns = useMemo<PostStatus[]>(
    () => (showArchived ? [...POST_PIPELINE, "archived"] : POST_PIPELINE),
    [showArchived],
  );

  const byStatus = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    (posts ?? []).forEach((p) => {
      (map[p.status] ??= []).push(p);
    });
    return map;
  }, [posts]);

  const archivedCount = (byStatus["archived"] ?? []).length;
  const editingPost = (posts ?? []).find((p) => p.id === editingId) ?? null;

  function onDrop(e: DragEvent, status: PostStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setOverCol(null);
    setDragId(null);
    if (id) {
      const post = (posts ?? []).find((p) => p.id === id);
      if (post && post.status !== status) onStatusChange(id, status);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="num text-xs uppercase tracking-wide text-muted">Editorial board</h2>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="num text-xs uppercase tracking-wide text-muted hover:text-content transition-colors duration-fast inline-flex items-center gap-1.5"
        >
          <Archive size={13} strokeWidth={1.5} aria-hidden />
          {showArchived ? "Hide archived" : `Show archived${archivedCount ? ` (${archivedCount})` : ""}`}
        </button>
      </div>

      {editingPost && (
        <div className="mt-4">
          <PostEditor
            post={editingPost}
            busy={busyId === editingPost.id}
            onSave={(patch) => {
              onSave(editingPost.id, patch);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {posts === null ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No posts yet. Generate drafts from an anonymised insight in the bank.
        </p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-3">
          {columns.map((status) => {
            const items = byStatus[status] ?? [];
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(status);
                }}
                onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                onDrop={(e) => onDrop(e, status)}
                className={
                  "shrink-0 w-[264px] rounded-md border bg-ground/40 p-2 transition-colors duration-fast " +
                  (overCol === status ? "border-accent" : "border-line")
                }
              >
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="num text-xs uppercase tracking-wide text-muted">
                    {POST_STATUS_LABEL[status]}
                  </span>
                  <span className="num text-xs text-faint">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      busy={busyId === post.id}
                      dragging={dragId === post.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", post.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(post.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onEdit={() => setEditingId(post.id)}
                      onMarkPosted={(url) => onMarkPosted(post.id, url)}
                      onArchive={() => onArchive(post.id)}
                      onDelete={() => onDelete(post.id)}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="px-1 py-3 text-xs text-faint">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  busy,
  dragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onMarkPosted,
  onArchive,
  onDelete,
}: {
  post: ContentPost;
  busy: boolean;
  dragging: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onMarkPosted: (url: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [marking, setMarking] = useState(false);
  const [url, setUrl] = useState(post.linkedin_url ?? "");

  async function doCopy() {
    try {
      await copyText(toLinkedInPlaintext(post.body));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  const headline = post.hook?.trim() || firstLine(post.body);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={
        "rounded-md border border-line bg-surface p-3 cursor-grab active:cursor-grabbing " +
        (dragging ? "opacity-50" : "")
      }
    >
      {post.variant_label && (
        <p className="num text-[10px] uppercase tracking-wide text-faint mb-1">
          {post.variant_label}
        </p>
      )}
      <p className="text-sm text-content leading-snug line-clamp-3">{headline}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
        {post.cta_type !== "none" && (
          <span className="num uppercase tracking-wide">{POST_CTA_LABEL[post.cta_type]}</span>
        )}
        {post.scheduled_for && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={11} strokeWidth={1.5} aria-hidden />
            {formatWhen(post.scheduled_for)}
          </span>
        )}
        {post.posted_at && (
          <span className="inline-flex items-center gap-1" style={{ color: "var(--oo-pos)" }}>
            <CheckCircle2 size={11} strokeWidth={1.5} aria-hidden />
            {formatWhen(post.posted_at)}
          </span>
        )}
        {post.linkedin_url && (
          <a
            href={post.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted hover:text-content transition-colors duration-fast"
          >
            <ExternalLink size={11} strokeWidth={1.5} aria-hidden />
            View
          </a>
        )}
      </div>

      {marking ? (
        <div className="mt-3 space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste the LinkedIn post URL"
            className="w-full bg-ground border border-line rounded px-2 py-1.5 text-xs text-content placeholder:text-faint focus:border-accent"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onMarkPosted(url.trim());
                setMarking(false);
              }}
              disabled={busy}
              className="num text-[11px] uppercase tracking-wide px-2 py-1 rounded bg-accent text-ink disabled:opacity-60"
            >
              Mark posted
            </button>
            <button
              onClick={() => setMarking(false)}
              className="num text-[11px] uppercase tracking-wide px-2 py-1 text-faint hover:text-content"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-0.5 border-t border-line pt-2">
          {busy && (
            <Loader2 size={13} className="motion-safe:animate-spin text-faint mr-1" aria-hidden />
          )}
          <IconBtn title="Edit" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.5} aria-hidden />
          </IconBtn>
          <IconBtn title={copied ? "Copied" : "Copy for LinkedIn"} onClick={() => void doCopy()}>
            {copied ? (
              <Check size={14} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
            ) : (
              <Copy size={14} strokeWidth={1.5} aria-hidden />
            )}
          </IconBtn>
          {post.status !== "posted" && (
            <IconBtn title="Mark as posted" onClick={() => setMarking(true)}>
              <CheckCircle2 size={14} strokeWidth={1.5} aria-hidden />
            </IconBtn>
          )}
          {post.status !== "archived" && (
            <IconBtn title="Archive" onClick={onArchive}>
              <Archive size={14} strokeWidth={1.5} aria-hidden />
            </IconBtn>
          )}
          <span className="ml-auto">
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  disabled={busy}
                  className="num text-[10px] uppercase tracking-wide px-1.5 py-1 rounded disabled:opacity-50"
                  style={{ color: "var(--oo-neg)" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="num text-[10px] uppercase tracking-wide px-1.5 py-1 text-faint hover:text-content"
                >
                  No
                </button>
              </span>
            ) : (
              <IconBtn title="Delete" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} strokeWidth={1.5} aria-hidden />
              </IconBtn>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-muted hover:text-content transition-colors duration-fast"
    >
      {children}
    </button>
  );
}

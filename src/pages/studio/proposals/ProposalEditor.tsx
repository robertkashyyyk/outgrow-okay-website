import { useState, type FormEvent } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  PROPOSAL_FORMATS,
  PROPOSAL_FORMAT_LABEL,
  PROPOSAL_STATUSES,
  PROPOSAL_STATUS_LABEL,
  slugify,
  type Proposal,
  type ProposalFormat,
  type ProposalStatus,
} from "../../../types/proposal";
import { ProposalBody } from "../../../components/ProposalBody";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-xs text-muted mb-1.5 num uppercase tracking-wide";

export interface ProposalFormValue {
  title: string;
  slug: string;
  format: ProposalFormat;
  body: string;
  status: ProposalStatus;
  amount_pence: number | null;
  currency: string;
}

const CURRENCIES = ["gbp", "usd", "eur"];

// Add/edit a proposal. The body is either markdown or a single self-contained HTML
// document — the preview toggle renders it exactly as the customer will see it.
export function ProposalEditor({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial?: Proposal;
  onSave: (v: ProposalFormValue) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [format, setFormat] = useState<ProposalFormat>(initial?.format ?? "markdown");
  const [body, setBody] = useState(initial?.body ?? "");
  const [status, setStatus] = useState<ProposalStatus>(initial?.status ?? "draft");
  // Amount is held as a pounds string in the form; stored as integer pence.
  const [amount, setAmount] = useState(
    initial?.amount_pence != null ? (initial.amount_pence / 100).toString() : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "gbp");
  const [preview, setPreview] = useState(false);

  function onTitleChange(next: string) {
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next)); // keep slug in step until hand-edited
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !body.trim()) return;
    const pounds = parseFloat(amount);
    const amount_pence =
      amount.trim() === "" || Number.isNaN(pounds) ? null : Math.round(pounds * 100);
    onSave({
      title: title.trim(),
      slug: slug.trim(),
      format,
      body,
      status,
      amount_pence,
      currency,
    });
  }

  const canPreview = body.trim().length > 0;

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Title</label>
          <input
            placeholder="e.g. Cairnfields — Phase 0"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={FIELD}
            autoFocus
          />
        </div>
        <div>
          <label className={LABEL}>Slug</label>
          <input
            placeholder="cairnfields-phase-0"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={`${FIELD} num`}
          />
        </div>
        <div>
          <label className={LABEL}>Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ProposalFormat)}
            className={FIELD}
          >
            {PROPOSAL_FORMATS.map((f) => (
              <option key={f} value={f}>
                {PROPOSAL_FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProposalStatus)}
            className={FIELD}
          >
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROPOSAL_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Amount</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="e.g. 2000 (leave blank for none)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${FIELD} num`}
          />
          <p className="mt-1 text-xs text-faint">
            Sets the “Approve &amp; pay” button. Blank = no payment.
          </p>
        </div>
        <div>
          <label className={LABEL}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${FIELD} uppercase`}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={`${LABEL} mb-0`}>
            {format === "html" ? "HTML document" : "Markdown"}
          </label>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            disabled={!canPreview}
            className="inline-flex items-center gap-1.5 num text-xs uppercase tracking-wide text-muted hover:text-content transition-colors duration-fast disabled:opacity-40"
          >
            {preview ? (
              <EyeOff size={13} strokeWidth={1.5} aria-hidden />
            ) : (
              <Eye size={13} strokeWidth={1.5} aria-hidden />
            )}
            {preview ? "Hide preview" : "Preview"}
          </button>
        </div>
        {preview && canPreview ? (
          <div className="rounded-md border border-line bg-ground p-4">
            <ProposalBody
              proposal={
                {
                  id: "preview",
                  client_id: "",
                  title: title || "Preview",
                  slug,
                  format,
                  body,
                  status,
                  amount_pence: null,
                  currency,
                  paid_at: null,
                  stripe_session_id: null,
                  first_viewed_at: null,
                  created_at: "",
                  updated_at: "",
                } as Proposal
              }
              iframeClassName="w-full h-[60vh] min-h-[480px] border border-line rounded-lg bg-paper"
            />
          </div>
        ) : (
          <textarea
            placeholder={
              format === "html"
                ? "Paste the full self-contained HTML document…"
                : "Write or paste markdown…"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className={`${FIELD} resize-y font-mono text-xs leading-relaxed`}
            spellCheck={format === "markdown"}
          />
        )}
        <p className="mt-1 num text-xs text-faint">{body.length} chars</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !slug.trim() || !body.trim()}
          className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
          Save proposal
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

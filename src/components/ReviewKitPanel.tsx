import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import {
  REVIEW_STEPS,
  PROMPT_INTERVIEW,
  PROMPT_REPORT,
  buildKitMarkdown,
} from "../content/reviewKit";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button
      onClick={() => void copy()}
      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast"
    >
      {copied ? (
        <Check size={14} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
      ) : (
        <Copy size={14} strokeWidth={1.5} aria-hidden />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

function PromptBlock({ title, hint, text }: { title: string; hint: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="font-heading font-bold text-sm text-content">{title}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <CopyButton text={text} label="Copy prompt" />
      </div>
      <pre className="max-h-64 overflow-auto px-4 py-3 text-xs leading-relaxed text-muted whitespace-pre-wrap font-mono">
        {text}
      </pre>
    </div>
  );
}

// The runnable kit: the five steps + both verbatim prompts (copyable) + a Markdown
// download. Shown on the instructions state and again on the return page.
export function ReviewKitPanel() {
  function downloadKit() {
    const blob = new Blob([buildKitMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "operational-review-kit.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="num text-xs uppercase tracking-wide text-muted">How to run it</h2>
        <button
          onClick={downloadKit}
          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast"
        >
          <Download size={14} strokeWidth={1.5} aria-hidden />
          Download (.md)
        </button>
      </div>

      <ol className="space-y-3">
        {REVIEW_STEPS.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="num shrink-0 text-sm font-bold" style={{ color: "var(--oo-accent, #b87d2a)" }}>
              {i + 1}
            </span>
            <span className="text-sm text-content leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        <PromptBlock
          title="Prompt 1 — the interview"
          hint="Paste this into your AI first."
          text={PROMPT_INTERVIEW}
        />
        <PromptBlock
          title="Prompt 2 — the report"
          hint="Paste this in once the interview says you're done."
          text={PROMPT_REPORT}
        />
      </div>
    </div>
  );
}

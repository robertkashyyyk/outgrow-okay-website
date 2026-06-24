import ReactMarkdown from "react-markdown";
import type { Proposal } from "../types/proposal";

// Renders a proposal body two ways:
//   - markdown → react-markdown into the token-styled .oo-article wrapper.
//   - html     → a sandboxed iframe. `sandbox="allow-scripts"` (note: NO
//     allow-same-origin) runs the document's own scripts (e.g. its page nav) inside a
//     unique opaque origin, so it CANNOT reach our Supabase session, cookies, or DOM.
//     Self-contained documents (fonts over CDN, inline script/style) render fine.
export function ProposalBody({
  proposal,
  iframeClassName = "w-full h-[78vh] border border-line rounded-lg bg-paper",
}: {
  proposal: Proposal;
  iframeClassName?: string;
}) {
  if (proposal.format === "html") {
    return (
      <iframe
        title={proposal.title}
        srcDoc={proposal.body}
        sandbox="allow-scripts"
        className={iframeClassName}
      />
    );
  }
  return (
    <div className="oo-article">
      <ReactMarkdown>{proposal.body}</ReactMarkdown>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Link as LinkIcon, Check, Pencil } from "lucide-react";
import { getProposalBySlug } from "../../../lib/studio-proposals";
import { ProposalBody } from "../../../components/ProposalBody";
import {
  PROPOSAL_STATUS_LABEL,
  type Proposal,
  type ProposalStatus,
} from "../../../types/proposal";

const STATUS_COLOR: Record<ProposalStatus, string> = {
  published: "var(--oo-pos)",
  draft: "var(--oo-warn)",
  archived: "var(--oo-grey-400)",
};

// Admin-side preview: renders a proposal exactly as the customer will see it (same
// ProposalBody component), but reachable from the Studio without a customer login.
// Drafts are previewable too, so you can check one before publishing.
export function StudioProposalPreview() {
  const { slug } = useParams<{ slug: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      try {
        const p = await getProposalBySlug(slug);
        if (!active) return;
        if (p) {
          setProposal(p);
          setState("ready");
        } else {
          setState("notfound");
        }
      } catch {
        if (active) setState("notfound");
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  async function copyPortalLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/portal/proposals/${proposal.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={proposal?.format === "html" ? "w-full" : "max-w-content"}>
      <Link
        to="/studio/proposals"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={15} strokeWidth={1.5} aria-hidden />
        All proposals
      </Link>

      {state === "loading" && <p className="mt-8 text-sm text-muted">Loading…</p>}

      {state === "notfound" && (
        <p className="mt-8 text-sm text-muted">That proposal doesn’t exist.</p>
      )}

      {state === "ready" && proposal && (
        <div className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="font-heading font-black text-xl sm:text-2xl text-content">
                  {proposal.title}
                </h1>
                <span
                  className="num inline-flex items-center gap-1.5 text-xs uppercase tracking-wide"
                  style={{ color: STATUS_COLOR[proposal.status] }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[proposal.status] }}
                  />
                  {PROPOSAL_STATUS_LABEL[proposal.status]}
                </span>
              </div>
              <p className="mt-1 num text-xs text-faint">
                Admin preview — this is what the client sees in their Portal.
                {proposal.status !== "published" && " (Not published yet.)"}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={copyPortalLink}
                className="inline-flex items-center gap-2 border border-line rounded-md px-3 py-2 text-sm text-muted hover:text-content hover:border-content transition-colors duration-fast"
              >
                {copied ? (
                  <Check size={14} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
                ) : (
                  <LinkIcon size={14} strokeWidth={1.5} aria-hidden />
                )}
                {copied ? "Copied" : "Copy portal link"}
              </button>
              <Link
                to={`/studio/clients/${proposal.client_id}`}
                title="Manage on client"
                className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
              >
                <Pencil size={16} strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <ProposalBody
              proposal={proposal}
              iframeClassName="w-full h-[calc(100vh-12rem)] min-h-[600px] border border-line rounded-lg bg-paper"
            />
          </div>
        </div>
      )}
    </div>
  );
}

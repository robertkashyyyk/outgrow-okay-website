import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getMyProposalBySlug, markProposalViewed } from "../../lib/portal-proposals";
import { ProposalBody } from "../../components/ProposalBody";
import type { Proposal } from "../../types/proposal";

export function PortalProposalView() {
  const { slug } = useParams<{ slug: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      try {
        const p = await getMyProposalBySlug(slug);
        if (!active) return;
        if (p) {
          setProposal(p);
          setState("ready");
          // Best-effort first-open stamp; failure here must not block viewing.
          void markProposalViewed(slug);
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

  return (
    <div className={proposal?.format === "html" ? "w-full" : "max-w-content"}>
      <Link
        to="/portal/proposals"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={15} strokeWidth={1.5} aria-hidden />
        Proposals
      </Link>

      {state === "loading" && <p className="mt-8 text-sm text-muted">Loading…</p>}

      {state === "notfound" && (
        <div className="mt-8 border border-line rounded-lg p-6 max-w-prose">
          <p className="text-base text-content">We couldn&rsquo;t find that proposal.</p>
          <p className="mt-2 text-sm text-muted">
            It may have been moved. Get in touch and we&rsquo;ll sort it out.
          </p>
        </div>
      )}

      {state === "ready" && proposal && (
        <div className="mt-6">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-content">
            {proposal.title}
          </h1>
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

import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import {
  getMyProposalBySlug,
  markProposalViewed,
  startProposalCheckout,
} from "../../lib/portal-proposals";
import { ProposalBody } from "../../components/ProposalBody";
import { formatMoney, type Proposal } from "../../types/proposal";

export function PortalProposalView() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const justPaid = params.get("paid") === "1";

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  async function pay() {
    if (!slug) return;
    setPaying(true);
    setPayError(null);
    try {
      const url = await startProposalCheckout(slug);
      window.location.assign(url); // hand off to Stripe-hosted Checkout
    } catch (e) {
      setPayError((e as Error).message);
      setPaying(false);
    }
  }

  // Honour a "pay" button INSIDE the proposal's sandboxed iframe. The document can't
  // call us directly (no same-origin), but it can postMessage. We only act on a
  // message that actually came from this proposal's iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "oo:checkout") void pay();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const isPaid = Boolean(proposal?.paid_at) || justPaid;
  const hasPrice = proposal?.amount_pence != null;

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
          <p className="text-base text-content">We couldn’t find that proposal.</p>
          <p className="mt-2 text-sm text-muted">
            It may have been moved. Get in touch and we’ll sort it out.
          </p>
        </div>
      )}

      {state === "ready" && proposal && (
        <div className="mt-6">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-content">
            {proposal.title}
          </h1>

          {/* Payment bar — only when the proposal carries a price. */}
          {hasPrice && (
            <div className="mt-4 rounded-lg border border-line p-4 flex flex-wrap items-center justify-between gap-4">
              {isPaid ? (
                <p
                  className="inline-flex items-center gap-2 text-sm"
                  style={{ color: "var(--oo-pos)" }}
                >
                  <CheckCircle2 size={18} strokeWidth={1.5} aria-hidden />
                  Payment received — thank you.
                </p>
              ) : (
                <>
                  <div>
                    <p className="num text-2xl text-content">
                      {formatMoney(proposal.amount_pence!, proposal.currency)}
                    </p>
                    {payError && (
                      <p className="mt-1 text-xs" style={{ color: "var(--oo-neg)" }}>
                        {payError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => void pay()}
                    disabled={paying}
                    className="inline-flex items-center justify-center gap-2 bg-accent px-6 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
                  >
                    {paying && (
                      <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />
                    )}
                    {paying ? "Opening secure checkout…" : "Approve & pay"}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-6">
            <ProposalBody
              proposal={proposal}
              iframeRef={iframeRef}
              iframeClassName="w-full h-[calc(100vh-14rem)] min-h-[600px] border border-line rounded-lg bg-paper"
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { listMyProposals } from "../../lib/portal-proposals";
import { ProposalCardList } from "../../components/ProposalCardList";
import type { ProposalSummary } from "../../types/proposal";

export function PortalProposals() {
  const [proposals, setProposals] = useState<ProposalSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listMyProposals();
        if (active) setProposals(list);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-content">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        Proposals
      </h1>

      {error && (
        <p className="mt-6 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}

      <div className="mt-8">
        {proposals === null && !error ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (proposals?.length ?? 0) === 0 ? (
          <div className="border border-line rounded-lg p-6 max-w-prose">
            <p className="text-base text-content">No proposals yet.</p>
            <p className="mt-2 text-sm text-muted">
              When there&rsquo;s a proposal to review, it&rsquo;ll appear here and
              we&rsquo;ll let you know.
            </p>
          </div>
        ) : (
          <ProposalCardList proposals={proposals ?? []} />
        )}
      </div>
    </div>
  );
}

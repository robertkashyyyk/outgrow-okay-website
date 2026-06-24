import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { listMyProposals } from "../../lib/portal-proposals";
import { ProposalCardList } from "../../components/ProposalCardList";
import type { ProposalSummary } from "../../types/proposal";

function firstName(profile: { full_name: string | null; email: string | null }) {
  if (profile.full_name) return profile.full_name.split(" ")[0];
  return profile.email?.split("@")[0] ?? "there";
}

export function PortalDashboard() {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<ProposalSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listMyProposals();
        if (active) setProposals(list);
      } catch {
        if (active) setProposals([]); // soft-fail: dashboard still renders
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const hasProposals = (proposals?.length ?? 0) > 0;

  return (
    <div className="max-w-content">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        {profile ? `Welcome, ${firstName(profile)}.` : "Welcome."}
      </h1>
      <p className="mt-4 max-w-prose text-md text-muted">
        This is your space with Outgrow Okay. Your proposals and shared documents
        show up here as we work together.
      </p>

      <div className="mt-8">
        {proposals === null ? (
          <div className="border border-line rounded-lg p-6 max-w-prose">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        ) : hasProposals ? (
          <div>
            <h2 className="num text-xs uppercase tracking-wide text-muted mb-3">
              Proposals
            </h2>
            <ProposalCardList proposals={proposals ?? []} />
          </div>
        ) : (
          <div className="border border-line rounded-lg p-6 max-w-prose">
            <p className="text-base text-content">Nothing waiting on you right now.</p>
            <p className="mt-2 text-sm text-muted">
              When there&rsquo;s a proposal to review or a document to sign, it&rsquo;ll
              appear here and we&rsquo;ll let you know.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

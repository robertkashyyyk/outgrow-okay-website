import { Link } from "react-router-dom";
import { FileSignature, ArrowRight } from "lucide-react";
import type { ProposalSummary } from "../types/proposal";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Customer-facing list of proposals. Each links to the Portal viewer by slug. Shared
// by the dashboard and the dedicated Proposals page so they stay identical.
export function ProposalCardList({ proposals }: { proposals: ProposalSummary[] }) {
  return (
    <ul className="space-y-3">
      {proposals.map((p) => (
        <li key={p.id}>
          <Link
            to={`/portal/proposals/${p.slug}`}
            className="group flex items-center gap-4 rounded-lg border border-line p-5 transition-colors duration-fast hover:border-content"
          >
            <FileSignature
              size={20}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 text-muted"
            />
            <div className="min-w-0 flex-1">
              <p className="text-base text-content">{p.title}</p>
              <p className="mt-0.5 num text-xs text-faint">
                {p.first_viewed_at ? "Opened" : "New"} · {formatDate(p.created_at)}
              </p>
            </div>
            <ArrowRight
              size={18}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 text-faint transition-colors duration-fast group-hover:text-content"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

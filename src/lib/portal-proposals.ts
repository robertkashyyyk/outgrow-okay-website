// Portal-side (customer) proposal access. RLS scopes every read to the signed-in
// customer's own client and to PUBLISHED proposals only — there's no way for a
// customer to see another client's work or an unpublished draft. The view stamp goes
// through a security-definer RPC so the customer never needs UPDATE on the table.

import { supabase } from "./supabase";
import type { Proposal, ProposalSummary } from "../types/proposal";

const PROPOSAL_COLS =
  "id,client_id,title,slug,format,body,status,first_viewed_at,created_at,updated_at";
const SUMMARY_COLS =
  "id,client_id,title,slug,format,status,first_viewed_at,created_at,updated_at";

// The customer's proposals (published, their client). Summaries for the list view.
export async function listMyProposals(): Promise<ProposalSummary[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select(SUMMARY_COLS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProposalSummary[]) ?? [];
}

export async function getMyProposalBySlug(slug: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from("proposals")
    .select(PROPOSAL_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Proposal | null) ?? null;
}

// Record the first open. Idempotent server-side — only stamps if not already viewed.
export async function markProposalViewed(slug: string): Promise<void> {
  await supabase.rpc("mark_proposal_viewed", { p_slug: slug });
}

// Portal-side (customer) proposal access. RLS scopes every read to the signed-in
// customer's own client and to PUBLISHED proposals only — there's no way for a
// customer to see another client's work or an unpublished draft. The view stamp goes
// through a security-definer RPC so the customer never needs UPDATE on the table.

import { supabase } from "./supabase";
import type { Proposal, ProposalSummary } from "../types/proposal";

const PROPOSAL_COLS =
  "id,client_id,title,slug,format,body,status,amount_pence,currency,paid_at,stripe_session_id,first_viewed_at,created_at,updated_at";
const SUMMARY_COLS =
  "id,client_id,title,slug,format,status,amount_pence,currency,paid_at,stripe_session_id,first_viewed_at,created_at,updated_at";

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

// Start a Stripe Checkout for this proposal's amount. The edge function reads the
// price server-side (the browser never sends it) and returns the hosted Stripe URL.
export async function startProposalCheckout(slug: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-proposal-checkout", {
    body: { slug },
  });
  if (error) throw new Error(error.message);
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("No checkout URL returned.");
  return url;
}

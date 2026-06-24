// Studio-side proposal data access. Uses the authenticated supabase-js client; the
// admin RLS policies from the proposals migration mean an admin reads/writes
// everything and a non-admin session sees nothing. Nothing here is public.

import { supabase } from "./supabase";
import type { Proposal, ProposalDraft, ProposalSummary } from "../types/proposal";

const PROPOSAL_COLS =
  "id,client_id,title,slug,format,body,status,first_viewed_at,created_at,updated_at";
const SUMMARY_COLS =
  "id,client_id,title,slug,format,status,first_viewed_at,created_at,updated_at";

// Proposals for one client (the Studio client-detail panel). Summaries only — the
// body can be large, and the list doesn't need it.
export async function listClientProposals(
  clientId: string,
): Promise<ProposalSummary[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select(SUMMARY_COLS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProposalSummary[]) ?? [];
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from("proposals")
    .select(PROPOSAL_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Proposal | null) ?? null;
}

export async function createProposal(draft: ProposalDraft): Promise<Proposal> {
  const { data, error } = await supabase
    .from("proposals")
    .insert(draft)
    .select(PROPOSAL_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Proposal;
}

export async function updateProposal(
  id: string,
  patch: Partial<ProposalDraft>,
): Promise<Proposal> {
  const { data, error } = await supabase
    .from("proposals")
    .update(patch)
    .eq("id", id)
    .select(PROPOSAL_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Proposal;
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

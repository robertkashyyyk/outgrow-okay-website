// Studio-side proposal data access. Uses the authenticated supabase-js client; the
// admin RLS policies from the proposals migration mean an admin reads/writes
// everything and a non-admin session sees nothing. Nothing here is public.

import { supabase } from "./supabase";
import type { Proposal, ProposalDraft, ProposalSummary } from "../types/proposal";

const PROPOSAL_COLS =
  "id,client_id,title,slug,format,body,status,first_viewed_at,created_at,updated_at";
const SUMMARY_COLS =
  "id,client_id,title,slug,format,status,first_viewed_at,created_at,updated_at";

// A summary plus the parent client's name, for the system-wide Proposals list.
export type ProposalWithClient = ProposalSummary & { client_name: string };

// PostgREST may surface an embedded to-one relation as an object or a single-element
// array depending on how it infers the FK; handle both.
type Embed<T> = T | T[] | null;
function one<T>(e: Embed<T>): T | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}

// Every proposal in the system, newest first, each labelled with its client.
export async function listAllProposals(): Promise<ProposalWithClient[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select(`${SUMMARY_COLS}, clients(company_name)`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  type Row = ProposalSummary & { clients?: Embed<{ company_name: string }> };
  return ((data as unknown as Row[] | null) ?? []).map((row) => {
    const { clients, ...rest } = row;
    return { ...rest, client_name: one(clients)?.company_name ?? "—" };
  });
}

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

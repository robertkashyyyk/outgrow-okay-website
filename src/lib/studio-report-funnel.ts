// Studio-side access to the inbound report funnel. Admin RLS gates everything; the
// public gate/return write through service-role edge functions, never here.

import { supabase } from "./supabase";
import type { ReportLead, ReportLeadSummary } from "../types/report-lead";

const SUMMARY_COLS =
  "id,created_at,name,email,utm_source,utm_medium,utm_campaign,status,submitted_at,read_sent_at";
const FULL_COLS =
  "id,created_at,name,email,return_token,utm_source,utm_medium,utm_campaign,status,report_text,submitted_at,read_notes,read_sent_at";

// Admin-initiated send: create a lead + fire the (warmer, "invite"-toned) kit email to
// a specific person, straight from the Studio. Reuses the public capture function.
export async function sendReviewKit(name: string, email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("report-funnel-capture", {
    body: { name: name.trim(), email: email.trim(), origin: "invite" },
  });
  if (error) throw new Error(error.message);
  const body = data as { error?: string } | null;
  if (body?.error) throw new Error(body.error);
}

export async function listLeads(): Promise<ReportLeadSummary[]> {
  const { data, error } = await supabase
    .from("report_leads")
    .select(SUMMARY_COLS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ReportLeadSummary[]) ?? [];
}

export async function getLead(id: string): Promise<ReportLead | null> {
  const { data, error } = await supabase
    .from("report_leads")
    .select(FULL_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ReportLead | null) ?? null;
}

export async function saveReadNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from("report_leads")
    .update({ read_notes: notes })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Stamp the read as sent (Robert emails it himself from his own inbox).
export async function markReadSent(id: string): Promise<void> {
  const { error } = await supabase
    .from("report_leads")
    .update({ status: "read_sent", read_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("report_leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

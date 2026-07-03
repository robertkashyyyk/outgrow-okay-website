export type ReportLeadStatus = "captured" | "submitted" | "read_sent";

export interface ReportLead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  return_token: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: ReportLeadStatus;
  report_text: string | null;
  submitted_at: string | null;
  read_notes: string | null;
  read_sent_at: string | null;
}

// List view doesn't need the (potentially long) report_text or read_notes.
export type ReportLeadSummary = Omit<ReportLead, "report_text" | "read_notes" | "return_token">;

export const REPORT_LEAD_STATUS_LABEL: Record<ReportLeadStatus, string> = {
  captured: "Captured",
  submitted: "Awaiting read",
  read_sent: "Read sent",
};

export const REPORT_LEAD_STATUSES: ReportLeadStatus[] = ["captured", "submitted", "read_sent"];

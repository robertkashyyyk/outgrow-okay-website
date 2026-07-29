// Public submit for the Bottleneck Workbook. Posts to the workbook-submit edge function
// (verify_jwt = false), which stores the submission and emails Robert + the reader.

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workbook-submit`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface WorkbookPayload {
  name: string;
  email: string;
  mode: "online" | "paper";
  constraint_text?: string;
  cost_per_month?: string;
  answers: Record<string, unknown>;
}

export async function submitWorkbook(payload: WorkbookPayload): Promise<void> {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong — please try again.");
}

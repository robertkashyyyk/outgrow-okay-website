// CRM record shapes — mirror the public.clients and public.contacts tables exactly.
// A client is a company/account; a contact is a person at that company. Contacts are
// what the Tasks module will hang off, and may optionally be linked to a Portal login
// (profile_id) once invited.

export type ClientStatus = "prospect" | "active" | "inactive";

export interface Client {
  id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  status: ClientStatus;
  // 'ad_hoc' when there's no named package/retainer; otherwise an OO stage name.
  package: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

// Fields the forms own. id/created_at/updated_at are DB-managed.
export type ClientDraft = Omit<Client, "id" | "created_at" | "updated_at">;
export type ContactDraft = Omit<
  Contact,
  "id" | "created_at" | "updated_at" | "profile_id"
>;

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  inactive: "Inactive",
};

// Package options offered in the form. 'ad_hoc' is the default catch-all; the named
// stages mirror the OO pricing ladder (Stages section). Stored as the value; shown as
// the label.
export const PACKAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "ad_hoc", label: "Ad hoc" },
  { value: "find", label: "Find" },
  { value: "change", label: "Change" },
  { value: "move", label: "Move" },
];

export function packageLabel(value: string): string {
  return PACKAGE_OPTIONS.find((p) => p.value === value)?.label ?? value;
}

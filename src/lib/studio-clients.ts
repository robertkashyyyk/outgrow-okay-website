// Studio-side CRM data access (clients + contacts). Uses the authenticated supabase-js
// client; the admin RLS policies from the clients_contacts migration mean an admin
// reads/writes everything and a non-admin session sees nothing. Nothing here is public.

import { supabase } from "./supabase";
import type {
  Client,
  ClientDraft,
  Contact,
  ContactDraft,
} from "../types/client";

const CLIENT_COLS =
  "id,company_name,website,industry,status,package,notes,created_at,updated_at";
const CONTACT_COLS =
  "id,client_id,name,email,phone,role,is_primary,profile_id,created_at,updated_at";

// ── Clients ──────────────────────────────────────────────────────────────────

export type ClientWithCount = Client & { contact_count: number };

export async function listClients(): Promise<ClientWithCount[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(`${CLIENT_COLS}, contacts(count)`)
    .order("company_name", { ascending: true });
  if (error) throw new Error(error.message);
  // Supabase returns the embedded count as `contacts: [{ count }]`.
  return (data ?? []).map((row) => {
    const { contacts, ...client } = row as Client & {
      contacts?: { count: number }[];
    };
    return { ...client, contact_count: contacts?.[0]?.count ?? 0 };
  });
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Client | null) ?? null;
}

export async function createClient(draft: ClientDraft): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert(draft)
    .select(CLIENT_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function updateClient(
  id: string,
  patch: Partial<ClientDraft>,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", id)
    .select(CLIENT_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  // contacts cascade-delete via the FK.
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function listContacts(clientId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_COLS)
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Contact[]) ?? [];
}

export async function createContact(
  draft: ContactDraft & { client_id: string },
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert(draft)
    .select(CONTACT_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function updateContact(
  id: string,
  patch: Partial<Contact>,
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select(CONTACT_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Make one contact the primary for its client: clear the flag on its siblings, set it
 * on this one. Two writes rather than a transaction — fine at studio scale, and the
 * UI only ever shows one primary regardless of a transient overlap.
 */
export async function setPrimaryContact(
  clientId: string,
  contactId: string,
): Promise<void> {
  const clearErr = (
    await supabase
      .from("contacts")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .neq("id", contactId)
  ).error;
  if (clearErr) throw new Error(clearErr.message);
  const setErr = (
    await supabase
      .from("contacts")
      .update({ is_primary: true })
      .eq("id", contactId)
  ).error;
  if (setErr) throw new Error(setErr.message);
}

/**
 * Invite a contact to the Portal: reuse the provision-account edge function (creates
 * the auth user + emails a one-time link), then stamp the returned user id onto the
 * contact as profile_id. The function re-checks admin server-side. Requires the
 * contact to have an email.
 */
export interface InviteResult {
  contact: Contact;
  /** Whether the branded invite/recovery email actually went out via Resend. */
  emailSent: boolean;
  /** True when the email already had an account and we linked it (vs created new). */
  existing: boolean;
}

export async function inviteContactToPortal(contact: Contact): Promise<InviteResult> {
  if (!contact.email) throw new Error("This contact has no email to invite.");
  const { data, error } = await supabase.functions.invoke("provision-account", {
    body: {
      email: contact.email.trim(),
      full_name: contact.name?.trim() ?? "",
      role: "customer",
    },
  });
  if (error) throw new Error(await readInvokeError(error));
  const body = data as {
    user_id?: string;
    error?: string;
    email_sent?: boolean;
    existing?: boolean;
  };
  if (body?.error) throw new Error(body.error);
  if (!body?.user_id) throw new Error("Invite succeeded but no user id returned.");
  const updated = await updateContact(contact.id, { profile_id: body.user_id });
  return {
    contact: updated,
    emailSent: Boolean(body.email_sent),
    existing: Boolean(body.existing),
  };
}

export interface SigninLink {
  actionLink: string;
  userId: string | null;
  existing: boolean;
}

/**
 * Generate a one-time Portal sign-in link for a contact WITHOUT sending an email —
 * for the admin to copy and deliver manually (Slack, their own email, etc.). Useful
 * when automated delivery is failing or you just want a link in hand. Also returns the
 * account's user id so the caller can link the contact if it isn't already.
 */
export async function getPortalSigninLink(email: string): Promise<SigninLink> {
  const { data, error } = await supabase.functions.invoke("portal-signin-link", {
    body: { email: email.trim() },
  });
  if (error) throw new Error(await readInvokeError(error));
  const body = data as {
    action_link?: string;
    user_id?: string;
    existing?: boolean;
    error?: string;
  };
  if (body?.error) throw new Error(body.error);
  if (!body?.action_link) throw new Error("No sign-in link was returned.");
  return {
    actionLink: body.action_link,
    userId: body.user_id ?? null,
    existing: Boolean(body.existing),
  };
}

// functions.invoke wraps non-2xx responses in a FunctionsHttpError whose JSON body
// carries the real message. Mirror of the helper in studio-insights.ts.
async function readInvokeError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* fall through */
    }
  }
  return (error as Error).message ?? "Request failed.";
}

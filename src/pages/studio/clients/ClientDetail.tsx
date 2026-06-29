import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Globe,
  Plus,
  Star,
  Mail,
  Phone,
  Send,
  Check,
  Link2,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getClient,
  deleteClient,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
  inviteContactToPortal,
  getPortalSigninLink,
} from "../../../lib/studio-clients";
import {
  CLIENT_STATUS_LABEL,
  packageLabel,
  type Client,
  type Contact,
} from "../../../types/client";
import { ClientTasksPanel } from "../tasks/ClientTasksPanel";
import { ClientProposalsPanel } from "../proposals/ClientProposalsPanel";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";

const STATUS_COLOR: Record<Client["status"], string> = {
  active: "var(--oo-pos)",
  prospect: "var(--oo-warn)",
  inactive: "var(--oo-grey-400)",
};

// Inline add/edit form for a single contact. Used for both creating a new contact and
// editing an existing one (seeded via `initial`).
function ContactEditor({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial?: Partial<Contact>;
  onSave: (v: { name: string; email: string; phone: string; role: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState(initial?.role ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: role.trim(),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD}
          autoFocus
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={FIELD}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD}
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={FIELD}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-heading font-bold text-sm text-ink rounded-md hover:brightness-105 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="num text-xs uppercase tracking-wide px-3 py-2 text-faint hover:text-content"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ContactRow({
  contact,
  onMakePrimary,
  onEdit,
  onDelete,
  onInvite,
  onCopyLink,
  copied,
  busy,
}: {
  contact: Contact;
  onMakePrimary: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInvite: () => void;
  onCopyLink: () => void;
  copied: boolean;
  busy: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-base text-content">
          {contact.name || "Unnamed contact"}
          {contact.is_primary && (
            <span className="num inline-flex items-center gap-1 text-xs uppercase tracking-wide text-content">
              <Star size={11} strokeWidth={2} aria-hidden /> Primary
            </span>
          )}
          {contact.profile_id && (
            <span
              className="num inline-flex items-center gap-1 text-xs uppercase tracking-wide"
              style={{ color: "var(--oo-pos)" }}
            >
              <Check size={11} strokeWidth={2} aria-hidden /> Portal
            </span>
          )}
        </p>
        {contact.role && (
          <p className="text-xs text-faint">{contact.role}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {contact.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail size={12} strokeWidth={1.5} aria-hidden />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="num inline-flex items-center gap-1.5">
              <Phone size={12} strokeWidth={1.5} aria-hidden />
              {contact.phone}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!contact.is_primary && (
          <button
            onClick={onMakePrimary}
            disabled={busy}
            title="Make primary"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast disabled:opacity-50"
          >
            <Star size={15} strokeWidth={1.5} aria-hidden />
          </button>
        )}
        {contact.email && (
          <button
            onClick={onCopyLink}
            disabled={busy}
            title="Copy a one-time Portal sign-in link (no email)"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast disabled:opacity-50"
          >
            {copied ? (
              <Check size={15} strokeWidth={2} aria-hidden style={{ color: "var(--oo-pos)" }} />
            ) : (
              <Link2 size={15} strokeWidth={1.5} aria-hidden />
            )}
          </button>
        )}
        {!contact.profile_id && contact.email && (
          <button
            onClick={onInvite}
            disabled={busy}
            title="Invite to Portal"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast disabled:opacity-50"
          >
            <Send size={15} strokeWidth={1.5} aria-hidden />
          </button>
        )}
        <button
          onClick={onEdit}
          title="Edit"
          className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
        >
          <Pencil size={15} strokeWidth={1.5} aria-hidden />
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-1">
            <button
              onClick={onDelete}
              disabled={busy}
              className="num text-xs uppercase tracking-wide px-2 py-1 rounded disabled:opacity-50"
              style={{ color: "var(--oo-neg)" }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
          >
            <Trash2 size={15} strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // contact id (or "new") being mutated
  const [copiedId, setCopiedId] = useState<string | null>(null); // contact whose link was just copied
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const c = await getClient(id);
        if (!active) return;
        if (!c) {
          setState("notfound");
          return;
        }
        setClient(c);
        const list = await listContacts(id);
        if (active) {
          setContacts(list);
          setState("ready");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setState("ready");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function refreshContacts() {
    if (!id) return;
    setContacts(await listContacts(id));
  }

  async function onAdd(v: {
    name: string;
    email: string;
    phone: string;
    role: string;
  }) {
    if (!id) return;
    setBusyId("new");
    setError(null);
    try {
      await createContact({
        client_id: id,
        name: v.name || null,
        email: v.email || null,
        phone: v.phone || null,
        role: v.role || null,
        is_primary: contacts.length === 0, // first contact is primary by default
      });
      await refreshContacts();
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onEditSave(
    contactId: string,
    v: { name: string; email: string; phone: string; role: string },
  ) {
    setBusyId(contactId);
    setError(null);
    try {
      await updateContact(contactId, {
        name: v.name || null,
        email: v.email || null,
        phone: v.phone || null,
        role: v.role || null,
      });
      await refreshContacts();
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onContactAction(
    contactId: string,
    action: () => Promise<unknown>,
  ) {
    setBusyId(contactId);
    setError(null);
    try {
      await action();
      await refreshContacts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // Invite (or link) a contact to the Portal, then surface whether the email actually
  // went out — a silent send failure is otherwise invisible.
  async function onInvite(contact: Contact) {
    setBusyId(contact.id);
    setError(null);
    setNotice(null);
    try {
      const res = await inviteContactToPortal(contact);
      await refreshContacts();
      if (res.emailSent) {
        setNotice(
          res.existing
            ? `${contact.email} already had an account — linked it and emailed a sign-in link.`
            : `Invite emailed to ${contact.email}.`,
        );
      } else {
        setError(
          `Account ${res.existing ? "linked" : "created"}, but the email didn't send. Use “Copy sign-in link” to send it to them yourself.`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // Copy a one-time Portal sign-in link to the clipboard (no email) so the admin can
  // deliver it manually — the reliable fallback when automated delivery fails.
  async function onCopyLink(contact: Contact) {
    if (!contact.email) return;
    setBusyId(contact.id);
    setError(null);
    setNotice(null);
    try {
      const res = await getPortalSigninLink(contact.email);
      // If this contact isn't linked to the account yet, link it now so they'll see
      // their proposals once they sign in.
      if (!contact.profile_id && res.userId) {
        await updateContact(contact.id, { profile_id: res.userId });
        await refreshContacts();
      }
      await navigator.clipboard.writeText(res.actionLink);
      setCopiedId(contact.id);
      window.setTimeout(() => setCopiedId(null), 2000);
      setNotice(`Sign-in link copied — send it to ${contact.email}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteClient() {
    if (!id) return;
    try {
      await deleteClient(id);
      navigate("/studio/clients");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (state === "loading") return <p className="text-sm text-muted">Loading…</p>;

  if (state === "notfound") {
    return (
      <div className="max-w-prose">
        <Link
          to="/studio/clients"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          All clients
        </Link>
        <p className="mt-6 text-md text-muted">This client doesn’t exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-content">
      <Link
        to="/studio/clients"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        All clients
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-content truncate">
            {client?.company_name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span
              className="num inline-flex items-center gap-2 text-xs uppercase tracking-wide"
              style={{ color: client ? STATUS_COLOR[client.status] : undefined }}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{
                  backgroundColor: client ? STATUS_COLOR[client.status] : undefined,
                }}
              />
              {client && CLIENT_STATUS_LABEL[client.status]}
            </span>
            <span className="num text-xs text-faint uppercase tracking-wide">
              {client && packageLabel(client.package)}
            </span>
            {client?.industry && (
              <span className="text-xs text-faint">{client.industry}</span>
            )}
            {client?.website && (
              <a
                href={
                  client.website.startsWith("http")
                    ? client.website
                    : `https://${client.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-content transition-colors duration-fast"
              >
                <Globe size={12} strokeWidth={1.5} aria-hidden />
                {client.website}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`/studio/clients/${id}/edit`}
            title="Edit client"
            className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
          >
            <Pencil size={16} strokeWidth={1.5} aria-hidden />
          </Link>
          {confirmDeleteClient ? (
            <span className="flex items-center gap-1">
              <button
                onClick={onDeleteClient}
                className="num text-xs uppercase tracking-wide px-2 py-1 rounded"
                style={{ color: "var(--oo-neg)" }}
              >
                Delete client
              </button>
              <button
                onClick={() => setConfirmDeleteClient(false)}
                className="num text-xs uppercase tracking-wide px-2 py-1 text-faint hover:text-content"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDeleteClient(true)}
              title="Delete client"
              className="p-2 rounded text-muted hover:text-content transition-colors duration-fast"
            >
              <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {client?.notes && (
        <p className="mt-5 max-w-prose text-sm text-muted whitespace-pre-line">
          {client.notes}
        </p>
      )}

      {error && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-neg)" }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-5 text-sm" style={{ color: "var(--oo-pos)" }}>
          {notice}
        </p>
      )}

      {/* Contacts */}
      <div className="mt-9">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <h2 className="font-heading font-bold text-base text-content">
            Contacts
            <span className="num ml-2 text-xs text-faint">{contacts.length}</span>
          </h2>
          {!adding && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
            >
              <Plus size={15} strokeWidth={1.5} aria-hidden />
              Add contact
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-4">
            <ContactEditor
              onSave={onAdd}
              onCancel={() => setAdding(false)}
              busy={busyId === "new"}
            />
          </div>
        )}

        {contacts.length === 0 && !adding ? (
          <p className="mt-4 text-sm text-muted">
            No contacts yet. Add the first person at this company.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {contacts.map((contact) =>
              editingId === contact.id ? (
                <li key={contact.id} className="py-3">
                  <ContactEditor
                    initial={contact}
                    onSave={(v) => onEditSave(contact.id, v)}
                    onCancel={() => setEditingId(null)}
                    busy={busyId === contact.id}
                  />
                </li>
              ) : (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  busy={busyId === contact.id}
                  copied={copiedId === contact.id}
                  onMakePrimary={() =>
                    onContactAction(contact.id, () =>
                      setPrimaryContact(contact.client_id, contact.id),
                    )
                  }
                  onEdit={() => {
                    setEditingId(contact.id);
                    setAdding(false);
                  }}
                  onDelete={() =>
                    onContactAction(contact.id, () => deleteContact(contact.id))
                  }
                  onInvite={() => onInvite(contact)}
                  onCopyLink={() => onCopyLink(contact)}
                />
              ),
            )}
          </ul>
        )}
      </div>

      {/* Tasks */}
      {id && (
        <ClientTasksPanel
          clientId={id}
          contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}

      {/* Proposals */}
      {id && <ClientProposalsPanel clientId={id} />}
    </div>
  );
}

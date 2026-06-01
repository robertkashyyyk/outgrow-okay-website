import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getClient,
  createClient,
  updateClient,
} from "../../../lib/studio-clients";
import {
  CLIENT_STATUS_LABEL,
  PACKAGE_OPTIONS,
  type ClientStatus,
} from "../../../types/client";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-sm text-muted mb-2";

const STATUSES: ClientStatus[] = ["prospect", "active", "inactive"];

export function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState<ClientStatus>("prospect");
  const [pkg, setPkg] = useState("ad_hoc");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const c = await getClient(id);
        if (!active) return;
        if (!c) {
          setError("Client not found.");
        } else {
          setCompanyName(c.company_name);
          setWebsite(c.website ?? "");
          setIndustry(c.industry ?? "");
          setStatus(c.status);
          setPkg(c.package);
          setNotes(c.notes ?? "");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("A company name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const draft = {
      company_name: companyName.trim(),
      website: website.trim() || null,
      industry: industry.trim() || null,
      status,
      package: pkg,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit && id) {
        await updateClient(id, draft);
        navigate(`/studio/clients/${id}`);
      } else {
        const created = await createClient(draft);
        navigate(`/studio/clients/${created.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="max-w-prose">
      <Link
        to={isEdit ? `/studio/clients/${id}` : "/studio/clients"}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        {isEdit ? "Back to client" : "All clients"}
      </Link>

      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        {isEdit ? "Edit client" : "New client"}
      </h1>

      <form onSubmit={onSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="company" className={LABEL}>
            Company name
          </label>
          <input
            id="company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={FIELD}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="website" className={LABEL}>
              Website
            </label>
            <input
              id="website"
              type="text"
              placeholder="example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="industry" className={LABEL}>
              Industry
            </label>
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="status" className={LABEL}>
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className={FIELD}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="package" className={LABEL}>
              Package
            </label>
            <select
              id="package"
              value={pkg}
              onChange={(e) => setPkg(e.target.value)}
              className={FIELD}
            >
              {PACKAGE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className={LABEL}>
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--oo-neg)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-accent px-6 py-3 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />}
          {isEdit ? "Save changes" : "Create client"}
        </button>
      </form>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ledger — a self-contained finance module for the Studio. Reads the live finance
 * views (fin_monthly_totals / fin_monthly_summary / fin_transactions / fin_merchant_rules)
 * and locks merchant→category rules via the fin_set_rule RPC. Styles are inline and the
 * only credential is the authenticated `supabase` client passed in — RLS scopes every
 * finance row to the signed-in owner.
 */

// ── Brand tokens (inline; Archivo/Inter/IBM Plex Mono with system fallbacks) ──
const INK = "#16130f";
const MUTED = "#6f6458";
const FAINT = "#9a8f80";
const CARD = "#ffffff";
const CHIP = "#f6f1e7";
const LINE = "#e4dccd";
const ACCENT = "#b87d2a";
const POS = "#3f7d4f";
const NEG = "#b4453e";
const HEAD = "Archivo, 'Helvetica Neue', system-ui, sans-serif";
const BODY = "Inter, system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

const CATEGORIES = ["General", "Ongoing", "One off", "Expires"];
const SIDES = ["business", "personal"] as const;
type Side = (typeof SIDES)[number];

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
function money(n: number | null | undefined): string {
  return gbp.format(Number(n ?? 0));
}
function periodLabel(p: string): string {
  if (!/^\d{4}$/.test(p)) return p;
  const y = 2000 + Number(p.slice(0, 2));
  const m = Number(p.slice(2, 4));
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}
function moneyColor(n: number): string {
  return n > 0 ? POS : n < 0 ? NEG : INK;
}

// ── shared bits ───────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>
      {children}
    </div>
  );
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, ...style }}>{children}</div>;
}

export default function LedgerModule({ supabase }: { supabase: SupabaseClient }) {
  const [tab, setTab] = useState<"overview" | "review" | "transactions">("overview");
  const tabs: { id: typeof tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "review", label: "Review" },
    { id: "transactions", label: "Transactions" },
  ];

  return (
    <div style={{ fontFamily: BODY, color: INK, maxWidth: 1080 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: ACCENT }}>Studio · Finance</div>
      <h1 style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, letterSpacing: "-.02em", margin: "14px 0 4px" }}>Ledger</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: 0, maxWidth: "60ch" }}>
        Your business and personal money in one place — monthly totals, merchant categorisation to confirm, and every transaction.
      </p>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${LINE}`, marginTop: 22 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              appearance: "none", background: "none", border: "none", cursor: "pointer",
              fontFamily: BODY, fontSize: 14, padding: "8px 16px", marginBottom: -1,
              color: tab === t.id ? INK : MUTED, fontWeight: tab === t.id ? 600 : 400,
              borderBottom: `2px solid ${tab === t.id ? INK : "transparent"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        {tab === "overview" && <Overview supabase={supabase} />}
        {tab === "review" && <Review supabase={supabase} />}
        {tab === "transactions" && <Transactions supabase={supabase} />}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
interface Totals { side: string; period: string; total_in: number; total_out: number; net: number; txns: number }
interface Summary { side: string; period: string; category: string; in_amt: number; out_amt: number; net: number }

function Overview({ supabase }: { supabase: SupabaseClient }) {
  const [totals, setTotals] = useState<Totals[] | null>(null);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, s] = await Promise.all([
        supabase.from("fin_monthly_totals").select("*").order("period", { ascending: false }),
        supabase.from("fin_monthly_summary").select("*").order("period", { ascending: false }),
      ]);
      if (!active) return;
      if (t.error) setErr(t.error.message);
      else setTotals((t.data as Totals[]) ?? []);
      if (!s.error) setSummary((s.data as Summary[]) ?? []);
    })();
    return () => { active = false; };
  }, [supabase]);

  const periods = useMemo(() => Array.from(new Set((totals ?? []).map((r) => r.period))).sort().reverse(), [totals]);
  const latest = periods[0];

  if (err) return <p style={{ color: NEG, fontSize: 14 }}>{err}</p>;
  if (totals === null) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;
  if (totals.length === 0) return <p style={{ color: MUTED, fontSize: 14 }}>No finance data yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Headline cards for the latest period */}
      <div>
        <Eyebrow>Latest · {latest ? periodLabel(latest) : "—"}</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {SIDES.map((side) => {
            const row = totals.find((r) => r.period === latest && r.side === side);
            return (
              <Card key={side}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: MUTED }}>{side}</div>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, marginTop: 6, color: moneyColor(row?.net ?? 0) }}>
                  {money(row?.net)}
                </div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>
                  <span style={{ color: POS }}>{money(row?.total_in)} in</span>{" · "}
                  <span style={{ color: NEG }}>{money(row?.total_out)} out</span>{" · "}
                  {row?.txns ?? 0} txns
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Months table */}
      <div>
        <Eyebrow>By month</Eyebrow>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: MUTED, fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                <th style={thL}>Month</th><th style={thL}>Side</th>
                <th style={thR}>In</th><th style={thR}>Out</th><th style={thR}>Net</th><th style={thR}>Txns</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((r, i) => (
                <tr key={`${r.period}-${r.side}`} style={{ borderTop: `1px solid ${LINE}`, background: i % 2 ? "transparent" : "transparent" }}>
                  <td style={tdL}>{periodLabel(r.period)}</td>
                  <td style={{ ...tdL, textTransform: "capitalize", color: MUTED }}>{r.side}</td>
                  <td style={{ ...tdR, color: POS }}>{money(r.total_in)}</td>
                  <td style={{ ...tdR, color: NEG }}>{money(r.total_out)}</td>
                  <td style={{ ...tdR, color: moneyColor(r.net), fontWeight: 500 }}>{money(r.net)}</td>
                  <td style={{ ...tdR, color: MUTED }}>{r.txns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Category breakdown for latest period */}
      {latest && (
        <div>
          <Eyebrow>Categories · {periodLabel(latest)}</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {SIDES.map((side) => {
              const rows = summary.filter((r) => r.period === latest && r.side === side);
              return (
                <Card key={side}>
                  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>{side}</div>
                  {rows.length === 0 ? (
                    <div style={{ fontSize: 13, color: FAINT }}>—</div>
                  ) : (
                    rows.map((r) => (
                      <div key={r.category} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13.5 }}>
                        <span>{r.category}</span>
                        <span style={{ fontFamily: MONO, color: moneyColor(r.net) }}>{money(r.net)}</span>
                      </div>
                    ))
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review (merchant rules to confirm) ────────────────────────────────────────
interface Rule { id: number; side: string; merchant_key: string; category: string; locked: boolean; votes: Record<string, number> | null }

function Review({ supabase }: { supabase: SupabaseClient }) {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const { data, error } = await supabase.from("fin_merchant_rules").select("*").eq("locked", false);
    if (error) { setErr(error.message); return; }
    const sorted = ((data as Rule[]) ?? []).sort((a, b) => voteTotal(b) - voteTotal(a));
    setRules(sorted);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [supabase]);

  function voteTotal(r: Rule): number {
    return Object.values(r.votes ?? {}).reduce((a, b) => a + Number(b), 0);
  }

  async function lockRule(r: Rule, category: string) {
    setBusyId(r.id);
    setErr(null);
    const { error } = await supabase.rpc("fin_set_rule", { p_side: r.side, p_merchant: r.merchant_key, p_category: category });
    if (error) setErr(error.message);
    else setRules((prev) => (prev ?? []).filter((x) => x.id !== r.id));
    setBusyId(null);
  }

  if (err) return <p style={{ color: NEG, fontSize: 14 }}>{err}</p>;
  if (rules === null) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;

  return (
    <div>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 16px", maxWidth: "62ch" }}>
        {rules.length === 0
          ? "All merchants confirmed — nothing to review."
          : `${rules.length} merchant${rules.length === 1 ? "" : "s"} to confirm. Pick the right category to lock it in — it applies to every transaction from that merchant.`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((r) => (
          <Card key={r.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 340 }}>
                  {r.merchant_key}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: FAINT, marginTop: 3, textTransform: "uppercase" }}>
                  {r.side} · {voteTotal(r)} txns · suggested: {r.category}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CATEGORIES.map((c) => {
                  const isSuggested = c === r.category;
                  return (
                    <button
                      key={c}
                      onClick={() => void lockRule(r, c)}
                      disabled={busyId === r.id}
                      style={{
                        appearance: "none", cursor: busyId === r.id ? "default" : "pointer",
                        fontFamily: BODY, fontSize: 12.5, padding: "6px 11px", borderRadius: 7,
                        border: `1px solid ${isSuggested ? ACCENT : LINE}`,
                        background: isSuggested ? ACCENT : CHIP,
                        color: isSuggested ? "#fff" : INK, opacity: busyId === r.id ? 0.5 : 1,
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────
interface Txn { id: number; side: string; period: string; txn_date: string; description: string; value: number; in_out: string; category: string; merchant_key: string }

function Transactions({ supabase }: { supabase: SupabaseClient }) {
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [side, setSide] = useState<"all" | Side>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Txn[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("fin_monthly_totals").select("period").order("period", { ascending: false });
      if (!active) return;
      const ps = Array.from(new Set((data ?? []).map((r: { period: string }) => r.period)));
      setPeriods(ps);
      setPeriod(ps[0] ?? "");
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!period) return;
    let active = true;
    (async () => {
      setRows(null);
      let query = supabase.from("fin_transactions").select("*").eq("period", period).order("txn_date", { ascending: false }).limit(1000);
      if (side !== "all") query = query.eq("side", side);
      const { data, error } = await query;
      if (!active) return;
      if (error) setErr(error.message);
      else setRows((data as Txn[]) ?? []);
    })();
    return () => { active = false; };
  }, [supabase, period, side]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !t || r.description?.toLowerCase().includes(t) || r.merchant_key?.toLowerCase().includes(t));
  }, [rows, q]);

  const sel: React.CSSProperties = { fontFamily: BODY, fontSize: 13, padding: "7px 10px", borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, color: INK };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={sel}>
          {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
        <select value={side} onChange={(e) => setSide(e.target.value as "all" | Side)} style={sel}>
          <option value="all">Both sides</option>
          <option value="business">Business</option>
          <option value="personal">Personal</option>
        </select>
        <input placeholder="Search description / merchant…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...sel, flex: 1, minWidth: 200 }} />
      </div>

      {err && <p style={{ color: NEG, fontSize: 14 }}>{err}</p>}
      {rows === null ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: MUTED, fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>
                <th style={thL}>Date</th><th style={thL}>Description</th><th style={thL}>Category</th><th style={thL}>Side</th><th style={thR}>Value</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${LINE}` }}>
                  <td style={{ ...tdL, whiteSpace: "nowrap", color: MUTED, fontFamily: MONO, fontSize: 12 }}>
                    {new Date(r.txn_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </td>
                  <td style={{ ...tdL, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</td>
                  <td style={{ ...tdL, color: MUTED }}>{r.category}</td>
                  <td style={{ ...tdL, color: FAINT, textTransform: "capitalize" }}>{r.side}</td>
                  <td style={{ ...tdR, fontFamily: MONO, color: r.in_out === "In" ? POS : NEG }}>{money(r.value)}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={5} style={{ ...tdL, color: FAINT, textAlign: "center", padding: 24 }}>No transactions match.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      {rows && <div style={{ fontSize: 12, color: FAINT, marginTop: 8 }}>{shown.length} shown</div>}
    </div>
  );
}

const thL: React.CSSProperties = { textAlign: "left", padding: "11px 16px", fontWeight: 400 };
const thR: React.CSSProperties = { textAlign: "right", padding: "11px 16px", fontWeight: 400 };
const tdL: React.CSSProperties = { textAlign: "left", padding: "10px 16px" };
const tdR: React.CSSProperties = { textAlign: "right", padding: "10px 16px", fontFamily: MONO };

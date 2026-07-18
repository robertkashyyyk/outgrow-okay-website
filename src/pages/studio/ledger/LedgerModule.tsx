import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ledger — a self-contained finance module for the Studio. Reads the live finance
 * views (fin_monthly_totals / fin_monthly_summary / fin_transactions /
 * fin_merchant_rules / fin_commitments / fin_projection) and locks merchant→category
 * rules via the fin_set_rule RPC. Styles are inline and the only credential is the
 * authenticated `supabase` client passed in — RLS scopes every finance row to the
 * signed-in owner.
 *
 * Overview reads the *honest* real_* columns (transfers excluded) and surfaces the
 * raw figure + internal-transfer total as a footnote, so both read. A top-level
 * Business | Personal | Both toggle drives every tab and persists across them.
 */

// ── Brand tokens (inline; Archivo/Inter/IBM Plex Mono with system fallbacks) ──
const INK = "#16130f";
const MUTED = "#6f6458";
const FAINT = "#9a8f80";
const CARD = "#ffffff";
const CHIP = "#f6f1e7";
const LINE = "#e4dccd";
const ACCENT = "#b87d2a";
const ACCENT_SOFT = "#e2c79c";
const POS = "#3f7d4f";
const NEG = "#b4453e";
const HEAD = "Archivo, 'Helvetica Neue', system-ui, sans-serif";
const BODY = "Inter, system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

const CATEGORIES = ["General", "Ongoing", "One off", "Expires"];
const SIDES = ["business", "personal"] as const;
type Side = (typeof SIDES)[number];
type SideFilter = Side | "both";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
function money(n: number | null | undefined): string {
  return gbp.format(num(n));
}
function moneyShort(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1000 ? `£${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `£${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
}
function num(n: number | string | null | undefined): number {
  return Number(n ?? 0);
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
function visibleSides(s: SideFilter): Side[] {
  return s === "both" ? [...SIDES] : [s];
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

function SideToggle({ value, onChange }: { value: SideFilter; onChange: (s: SideFilter) => void }) {
  const opts: { id: SideFilter; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "personal", label: "Personal" },
    { id: "both", label: "Both" },
  ];
  return (
    <div style={{ display: "inline-flex", background: CHIP, border: `1px solid ${LINE}`, borderRadius: 9, padding: 3, gap: 2 }}>
      {opts.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              appearance: "none", border: "none", cursor: "pointer", fontFamily: BODY, fontSize: 13,
              padding: "5px 14px", borderRadius: 6, background: on ? CARD : "transparent",
              color: on ? INK : MUTED, fontWeight: on ? 600 : 400,
              boxShadow: on ? "0 1px 2px rgba(0,0,0,.06)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function LedgerModule({ supabase }: { supabase: SupabaseClient }) {
  const [tab, setTab] = useState<"overview" | "commitments" | "projection" | "review" | "transactions">("overview");
  const [side, setSide] = useState<SideFilter>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("ledger.side") : null;
    return saved === "business" || saved === "personal" || saved === "both" ? saved : "both";
  });
  function changeSide(s: SideFilter) {
    setSide(s);
    try { localStorage.setItem("ledger.side", s); } catch { /* ignore */ }
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "commitments", label: "Commitments" },
    { id: "projection", label: "Projection" },
    { id: "review", label: "Review" },
    { id: "transactions", label: "Transactions" },
  ];

  return (
    <div style={{ fontFamily: BODY, color: INK, maxWidth: 1080 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: ACCENT }}>Studio · Finance</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, letterSpacing: "-.02em", margin: "14px 0 4px" }}>Ledger</h1>
          <p style={{ color: MUTED, fontSize: 14, margin: 0, maxWidth: "58ch" }}>
            Your money, honestly — real in/out with internal transfers stripped out, the commitments behind it, and where the next twelve months land.
          </p>
        </div>
        <div style={{ marginTop: 14 }}>
          <SideToggle value={side} onChange={changeSide} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${LINE}`, marginTop: 22, flexWrap: "wrap" }}>
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
        {tab === "overview" && <Overview supabase={supabase} side={side} />}
        {tab === "commitments" && <Commitments supabase={supabase} side={side} />}
        {tab === "projection" && <Projection supabase={supabase} side={side} />}
        {tab === "review" && <Review supabase={supabase} side={side} />}
        {tab === "transactions" && <Transactions supabase={supabase} side={side} />}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
interface Totals {
  side: string; period: string;
  total_in: number; total_out: number; net: number; txns: number;
  real_in: number; real_out: number; real_net: number; transfer_net: number;
}
interface Summary { side: string; period: string; category: string; in_amt: number; out_amt: number; net: number }

function Overview({ supabase, side }: { supabase: SupabaseClient; side: SideFilter }) {
  const [totals, setTotals] = useState<Totals[] | null>(null);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const sides = visibleSides(side);

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
  const rowsForSide = (totals ?? []).filter((r) => sides.includes(r.side as Side));

  if (err) return <p style={{ color: NEG, fontSize: 14 }}>{err}</p>;
  if (totals === null) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;
  if (totals.length === 0) return <p style={{ color: MUTED, fontSize: 14 }}>No finance data yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Headline cards for the latest period — honest (real_*) figures */}
      <div>
        <Eyebrow>Latest · {latest ? periodLabel(latest) : "—"} · real money</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {sides.map((s) => {
            const row = rowsForSide.find((r) => r.period === latest && r.side === s);
            return (
              <Card key={s}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: MUTED }}>{s}</div>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, marginTop: 6, color: moneyColor(num(row?.real_net)) }}>
                  {money(row?.real_net)}
                </div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>
                  <span style={{ color: POS }}>{money(row?.real_in)} in</span>{" · "}
                  <span style={{ color: NEG }}>{money(row?.real_out)} out</span>{" · "}
                  {row?.txns ?? 0} txns
                </div>
                {num(row?.transfer_net) !== 0 && (
                  <div style={{ fontSize: 11.5, color: FAINT, marginTop: 8, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
                    Raw net {money(row?.net)} · incl. {money(row?.transfer_net)} internal transfers (excluded above)
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Months table — real_* with a transfers column so the raw picture stays reachable */}
      <div>
        <Eyebrow>By month · real money</Eyebrow>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 560 }}>
              <thead>
                <tr style={{ color: MUTED, fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  <th style={thL}>Month</th>
                  {side === "both" && <th style={thL}>Side</th>}
                  <th style={thR}>In</th><th style={thR}>Out</th><th style={thR}>Net</th>
                  <th style={thR}>Transfers</th><th style={thR}>Txns</th>
                </tr>
              </thead>
              <tbody>
                {rowsForSide.map((r) => (
                  <tr key={`${r.period}-${r.side}`} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={tdL}>{periodLabel(r.period)}</td>
                    {side === "both" && <td style={{ ...tdL, textTransform: "capitalize", color: MUTED }}>{r.side}</td>}
                    <td style={{ ...tdR, color: POS }}>{money(r.real_in)}</td>
                    <td style={{ ...tdR, color: NEG }}>{money(r.real_out)}</td>
                    <td style={{ ...tdR, color: moneyColor(num(r.real_net)), fontWeight: 500 }}>{money(r.real_net)}</td>
                    <td style={{ ...tdR, color: num(r.transfer_net) ? FAINT : LINE }}>{num(r.transfer_net) ? money(r.transfer_net) : "—"}</td>
                    <td style={{ ...tdR, color: MUTED }}>{r.txns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div style={{ fontSize: 11.5, color: FAINT, marginTop: 8 }}>
          Net excludes internal transfers between your own accounts. The transfers column shows what was moved.
        </div>
      </div>

      {/* Category breakdown for latest period */}
      {latest && (
        <div>
          <Eyebrow>Categories · {periodLabel(latest)}</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {sides.map((s) => {
              const rows = summary.filter((r) => r.period === latest && r.side === s);
              return (
                <Card key={s}>
                  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>{s}</div>
                  {rows.length === 0 ? (
                    <div style={{ fontSize: 13, color: FAINT }}>—</div>
                  ) : (
                    rows.map((r) => (
                      <div key={r.category} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13.5 }}>
                        <span>{r.category}</span>
                        <span style={{ fontFamily: MONO, color: moneyColor(num(r.net)) }}>{money(r.net)}</span>
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

// ── Commitments ───────────────────────────────────────────────────────────────
interface Commitment {
  id: number; side: string; merchant_key: string; label: string; category: string;
  direction: string; monthly_amount: number; starts_on: string; ends_on: string | null;
  active: boolean; note: string | null;
}
const COMMIT_GROUPS = ["Ongoing", "Expires"];

function Commitments({ supabase, side }: { supabase: SupabaseClient; side: SideFilter }) {
  const [rows, setRows] = useState<Commitment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sides = visibleSides(side);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("fin_commitments").select("*").eq("active", true)
        .order("monthly_amount", { ascending: false });
      if (!active) return;
      if (error) setErr(error.message);
      else setRows((data as Commitment[]) ?? []);
    })();
    return () => { active = false; };
  }, [supabase]);

  async function patch(id: number, changes: Partial<Commitment>) {
    setRows((prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, ...changes } : r)));
    const { error } = await supabase.from("fin_commitments").update(changes).eq("id", id);
    if (error) setErr(error.message);
  }

  if (err) return <p style={{ color: NEG, fontSize: 14 }}>{err}</p>;
  if (rows === null) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;

  const visible = rows.filter((r) => sides.includes(r.side as Side));
  const grouped = COMMIT_GROUPS.map((g) => ({ group: g, items: visible.filter((r) => r.category === g) }));
  const otherItems = visible.filter((r) => !COMMIT_GROUPS.includes(r.category));
  if (otherItems.length) grouped.push({ group: "Other", items: otherItems });

  function signed(r: Commitment): number {
    return r.direction === "in" ? num(r.monthly_amount) : -num(r.monthly_amount);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <p style={{ fontSize: 14, color: MUTED, margin: 0, maxWidth: "64ch" }}>
        The regular money in and out behind your numbers. <strong style={{ color: INK }}>Ongoing</strong> runs indefinitely;
        <strong style={{ color: INK }}> Expires</strong> should carry an end date so it rolls off the projection. Edit an
        amount or end date inline — it saves as you go.
      </p>

      {grouped.map(({ group, items }) => {
        if (items.length === 0) return null;
        const netMonthly = items.reduce((a, r) => a + signed(r), 0);
        return (
          <div key={group}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
              <Eyebrow>{group} · {items.length}</Eyebrow>
              <div style={{ fontFamily: MONO, fontSize: 12.5, color: MUTED }}>
                <span style={{ color: moneyColor(netMonthly) }}>{money(netMonthly)}</span>/mo ·{" "}
                <span style={{ color: moneyColor(netMonthly * 12) }}>{money(netMonthly * 12)}</span>/yr
              </div>
            </div>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {items.map((r, i) => {
                const needsEnd = r.category === "Expires" && !r.ends_on;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 14, alignItems: "center", padding: "12px 16px",
                      borderTop: i ? `1px solid ${LINE}` : "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.label || r.merchant_key}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: FAINT, marginTop: 3, textTransform: "uppercase" }}>
                        {side === "both" ? `${r.side} · ` : ""}
                        <span style={{ color: r.direction === "in" ? POS : NEG }}>{r.direction === "in" ? "income" : "outgoing"}</span>
                        {needsEnd && (
                          <span style={{ color: ACCENT, textTransform: "none", marginLeft: 8 }}>· set an end date →</span>
                        )}
                      </div>
                    </div>
                    <EditableAmount
                      value={num(r.monthly_amount)}
                      color={r.direction === "in" ? POS : NEG}
                      sign={r.direction === "in" ? "+" : "−"}
                      onSave={(v) => patch(r.id, { monthly_amount: v })}
                    />
                    <EditableDate
                      value={r.ends_on}
                      highlight={needsEnd}
                      onSave={(v) => patch(r.id, { ends_on: v })}
                    />
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
      {visible.length === 0 && <p style={{ color: FAINT, fontSize: 14 }}>No commitments for this side.</p>}
    </div>
  );
}

function EditableAmount({ value, color, sign, onSave }: { value: number; color: string; sign: string; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    setEditing(false);
    const n = Number(draft);
    if (Number.isFinite(n) && n !== value) onSave(Math.round(n * 100) / 100);
  }
  if (editing) {
    return (
      <input
        autoFocus type="number" step="0.01" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{ width: 110, fontFamily: MONO, fontSize: 13.5, textAlign: "right", padding: "5px 8px", borderRadius: 7, border: `1px solid ${ACCENT}`, background: CARD, color: INK }}
      />
    );
  }
  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      title="Edit monthly amount"
      style={{ appearance: "none", cursor: "pointer", background: "none", border: `1px solid transparent`, borderRadius: 7, padding: "5px 8px", fontFamily: MONO, fontSize: 13.5, color, textAlign: "right", minWidth: 110 }}
    >
      {sign}{money(value)}
    </button>
  );
}

function EditableDate({ value, highlight, onSave }: { value: string | null; highlight?: boolean; onSave: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onSave(e.target.value || null)}
      title="End date"
      style={{
        fontFamily: MONO, fontSize: 12.5, padding: "5px 8px", borderRadius: 7,
        border: `1px solid ${highlight ? ACCENT : LINE}`,
        background: highlight ? "#fdf6ea" : CARD, color: value ? INK : FAINT, minWidth: 148,
      }}
    />
  );
}

// ── Projection ────────────────────────────────────────────────────────────────
interface Projection {
  period: string; side: string; month_start: string;
  committed_in: number; committed_out: number; general_avg: number;
  committed_net: number; projected_net: number;
}
interface ProjMonth { month_start: string; committed_net: number; general_avg: number; projected_net: number }

function Projection({ supabase, side }: { supabase: SupabaseClient; side: SideFilter }) {
  const [rows, setRows] = useState<Projection[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sides = visibleSides(side);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("fin_projection").select("*").order("month_start", { ascending: true });
      if (!active) return;
      if (error) setErr(error.message);
      else setRows((data as Projection[]) ?? []);
    })();
    return () => { active = false; };
  }, [supabase]);

  const months: ProjMonth[] = useMemo(() => {
    const rel = (rows ?? []).filter((r) => sides.includes(r.side as Side));
    const byMonth = new Map<string, ProjMonth>();
    for (const r of rel) {
      const m = byMonth.get(r.month_start) ?? { month_start: r.month_start, committed_net: 0, general_avg: 0, projected_net: 0 };
      m.committed_net += num(r.committed_net);
      m.general_avg += num(r.general_avg);
      m.projected_net += num(r.projected_net);
      byMonth.set(r.month_start, m);
    }
    return Array.from(byMonth.values()).sort((a, b) => a.month_start.localeCompare(b.month_start));
  }, [rows, side]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <p style={{ color: NEG, fontSize: 14 }}>{err}</p>;
  if (rows === null) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;
  if (months.length === 0) return <p style={{ color: FAINT, fontSize: 14 }}>No projection for this side.</p>;

  const avgProjected = months.reduce((a, m) => a + m.projected_net, 0) / months.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <Eyebrow>Projected monthly net · next {months.length} months</Eyebrow>
          <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, color: moneyColor(avgProjected) }}>
            {money(avgProjected)}<span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}> /mo avg</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginLeft: "auto", fontSize: 12, color: MUTED }}>
          <LegendKey color={ACCENT} label="Committed (in − out)" />
          <LegendKey color={ACCENT_SOFT} label="Variable (3-mo avg General)" />
        </div>
      </div>

      <Card>
        <ProjectionChart months={months} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {[months[0], months[Math.floor(months.length / 2)], months[months.length - 1]].map((m, i) => (
          <Card key={i} style={{ padding: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", color: MUTED }}>{monthLabel(m.month_start)}</div>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, marginTop: 4, color: moneyColor(m.projected_net) }}>{money(m.projected_net)}</div>
            <div style={{ fontSize: 12, color: FAINT, marginTop: 4 }}>
              {money(m.committed_net)} committed · {money(m.general_avg)} variable
            </div>
          </Card>
        ))}
      </div>

      <div style={{ fontSize: 12, color: FAINT, lineHeight: 1.6, maxWidth: "72ch", borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
        <strong style={{ color: MUTED }}>How this is built.</strong> Ongoing commitments are held flat. Expires commitments
        roll off after their end date (set one on the Commitments tab so it drops out here). General spending is the trailing
        3-month average. One-off transactions are excluded, and internal transfers between your own accounts are ignored
        entirely. It's a steady-state estimate, not a forecast of new work won or lost.
      </div>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function monthLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function ProjectionChart({ months }: { months: ProjMonth[] }) {
  const W = 720, H = 260, padL = 52, padR = 14, padT = 14, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const vals = months.flatMap((m) => [0, m.committed_net, m.projected_net]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const y = (v: number) => padT + innerH * (1 - (v - min) / span);
  const zeroY = y(0);
  const step = innerW / months.length;
  const barW = Math.min(30, step * 0.62);

  // Gridlines at min / 0 / max (skip 0 if it's an edge)
  const ticks = Array.from(new Set([min, 0, max])).filter((t) => t >= min && t <= max);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 560, display: "block" }} role="img" aria-label="Projected monthly net">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? MUTED : LINE} strokeWidth={t === 0 ? 1 : 1} strokeDasharray={t === 0 ? "" : "3 4"} />
            <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontFamily={MONO} fontSize={10} fill={FAINT}>{moneyShort(t)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = padL + step * i + (step - barW) / 2;
          // committed segment: 0 → committed_net; variable segment: committed_net → projected_net
          const yCommit = y(m.committed_net);
          const yProj = y(m.projected_net);
          const commitTop = Math.min(zeroY, yCommit), commitH = Math.abs(zeroY - yCommit);
          const varTop = Math.min(yCommit, yProj), varH = Math.abs(yCommit - yProj);
          return (
            <g key={m.month_start}>
              {commitH > 0.5 && <rect x={cx} y={commitTop} width={barW} height={commitH} fill={ACCENT} rx={2} />}
              {varH > 0.5 && <rect x={cx} y={varTop} width={barW} height={varH} fill={ACCENT_SOFT} rx={2} />}
              {/* projected_net marker */}
              <line x1={cx - 1} x2={cx + barW + 1} y1={yProj} y2={yProj} stroke={INK} strokeWidth={1.4} />
              <text x={cx + barW / 2} y={H - padB + 15} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={FAINT}>
                {new Date(m.month_start + "T00:00:00").toLocaleDateString("en-GB", { month: "short" })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Review (merchant rules to confirm) ────────────────────────────────────────
interface Rule { id: number; side: string; merchant_key: string; category: string; locked: boolean; votes: Record<string, number> | null }

function Review({ supabase, side }: { supabase: SupabaseClient; side: SideFilter }) {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const sides = visibleSides(side);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("fin_merchant_rules").select("*").eq("locked", false);
      if (!active) return;
      if (error) { setErr(error.message); return; }
      const sorted = ((data as Rule[]) ?? []).sort((a, b) => voteTotal(b) - voteTotal(a));
      setRules(sorted);
    })();
    return () => { active = false; };
  }, [supabase]);

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

  const visible = rules.filter((r) => sides.includes(r.side as Side));

  return (
    <div>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 16px", maxWidth: "62ch" }}>
        {visible.length === 0
          ? "All merchants confirmed — nothing to review."
          : `${visible.length} merchant${visible.length === 1 ? "" : "s"} to confirm. Pick the right category to lock it in — it applies to every transaction from that merchant.`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((r) => (
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
interface Txn { id: number; side: string; period: string; txn_date: string; description: string; value: number; in_out: string; category: string; merchant_key: string; is_transfer: boolean }

function Transactions({ supabase, side }: { supabase: SupabaseClient; side: SideFilter }) {
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [q, setQ] = useState("");
  const [hideTransfers, setHideTransfers] = useState(false);
  const [rows, setRows] = useState<Txn[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("fin_monthly_totals").select("period").order("period", { ascending: false });
      if (!active) return;
      const ps = Array.from(new Set((data ?? []).map((r: { period: string }) => r.period)));
      setPeriods(ps);
      setPeriod((p) => p || ps[0] || "");
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!period) return;
    let active = true;
    (async () => {
      setRows(null);
      let query = supabase.from("fin_transactions").select("*").eq("period", period).order("txn_date", { ascending: false }).limit(2000);
      if (side !== "both") query = query.eq("side", side);
      const { data, error } = await query;
      if (!active) return;
      if (error) setErr(error.message);
      else setRows((data as Txn[]) ?? []);
    })();
    return () => { active = false; };
  }, [supabase, period, side]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (hideTransfers && r.is_transfer) return false;
      if (!t) return true;
      return r.description?.toLowerCase().includes(t) || r.merchant_key?.toLowerCase().includes(t);
    });
  }, [rows, q, hideTransfers]);

  const sel: React.CSSProperties = { fontFamily: BODY, fontSize: 13, padding: "7px 10px", borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, color: INK };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={sel}>
          {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
        <input placeholder="Search description / merchant…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...sel, flex: 1, minWidth: 200 }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: MUTED, cursor: "pointer" }}>
          <input type="checkbox" checked={hideTransfers} onChange={(e) => setHideTransfers(e.target.checked)} />
          Hide internal transfers
        </label>
      </div>

      {err && <p style={{ color: NEG, fontSize: 14 }}>{err}</p>}
      {rows === null ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ color: MUTED, fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  <th style={thL}>Date</th><th style={thL}>Description</th><th style={thL}>Category</th>
                  {side === "both" && <th style={thL}>Side</th>}
                  <th style={thR}>Value</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={{ ...tdL, whiteSpace: "nowrap", color: MUTED, fontFamily: MONO, fontSize: 12 }}>
                      {new Date(r.txn_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </td>
                    <td style={{ ...tdL, maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.description}
                      {r.is_transfer && <span style={{ fontFamily: MONO, fontSize: 10, color: FAINT, marginLeft: 8, textTransform: "uppercase" }}>transfer</span>}
                    </td>
                    <td style={{ ...tdL, color: MUTED }}>{r.category}</td>
                    {side === "both" && <td style={{ ...tdL, color: FAINT, textTransform: "capitalize" }}>{r.side}</td>}
                    <td style={{ ...tdR, fontFamily: MONO, color: r.is_transfer ? FAINT : r.in_out === "In" ? POS : NEG }}>{money(r.value)}</td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={side === "both" ? 5 : 4} style={{ ...tdL, color: FAINT, textAlign: "center", padding: 24 }}>No transactions match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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

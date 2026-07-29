import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Lockup } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { useGround } from "../components/useGround";
import { submitWorkbook } from "../lib/workbook";

// The Bottleneck Workbook, fillable on-site. Two modes: fill it fresh here, or enter the
// key findings from the printed/pen version. "Request review" sends it to the Studio and
// emails the reader. Mirrors the printed workbook's worksheets.

const FIELD =
  "w-full bg-surface/60 border border-line rounded-md px-3.5 py-2.5 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent outline-none";
const LINE =
  "w-full bg-transparent border-0 border-b border-line px-0 py-2 text-base " +
  "text-content placeholder:text-faint focus:border-accent outline-none transition-colors duration-fast";
const KICKER = "num text-xs uppercase tracking-wide text-accent";
const H3 = "font-heading font-black text-lg text-content";

const FATES = ["Document", "Delegate", "Automate", "Delete"] as const;

function Section({
  n,
  kicker,
  title,
  lead,
  children,
}: {
  n?: string;
  kicker: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8 mt-10 first:mt-0 first:border-0 first:pt-0">
      <p className={KICKER}>{kicker}</p>
      <h2 className="mt-2 font-heading font-black text-xl sm:text-2xl text-content">
        {n && <span className="text-accent num mr-2">{n}</span>}
        {title}
      </h2>
      {lead && <p className="mt-3 text-md text-muted max-w-prose">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Workbook() {
  useGround("dark");

  const [mode, setMode] = useState<"online" | "paper">("online");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Answers
  const [constraint, setConstraint] = useState("");
  const [fears, setFears] = useState<string[]>(["", "", "", "", ""]);
  const [audit, setAudit] = useState(
    ["Selling / quoting", "Delivery / the work", "Fixing / firefighting", "Admin / finance", "“Quick questions”"].map(
      (act) => ({ act, hrs: "", onlyMe: false, couldWait: false }),
    ),
  );
  const [sort, setSort] = useState(
    Array.from({ length: 5 }, () => ({ task: "", fate: "", step: "" })),
  );
  const [sop, setSop] = useState({ task: "", trigger: "", steps: "", done: "", ask: "" });
  const [handoffTask, setHandoffTask] = useState("");
  const [handoff, setHandoff] = useState<boolean[]>([false, false, false, false, false]);
  const [costHours, setCostHours] = useState("");
  const [costRate, setCostRate] = useState("");
  const [plan, setPlan] = useState(["", "", "", ""]);

  const costMonth = useMemo(() => {
    const h = parseFloat(costHours);
    const r = parseFloat(costRate);
    if (!isFinite(h) || !isFinite(r) || h <= 0 || r <= 0) return "";
    return Math.round(h * r * 4.3).toLocaleString("en-GB");
  }, [costHours, costRate]);

  const HANDOFF_ITEMS = [
    "The outcome is defined, not just the steps",
    "They know the boundaries — decide alone vs. bring to you",
    "There's a written reference (the one-page SOP) they own",
    "A check-in rhythm exists, so you're not the fallback",
    "It's OK for it to be done 80% your way",
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Add your name and email so I can send the review back.");
      return;
    }
    setBusy(true);
    setError(null);

    const answers: Record<string, unknown> = {
      "Your one constraint": constraint,
      "Cost of staying the bottleneck": costMonth
        ? `${costHours}h × £${costRate} × 4.3 ≈ £${costMonth}/month`
        : "",
      "First thing being handed off": handoffTask,
      "Next 30 days": plan
        .map((p, i) => (p ? `Week ${i + 1}: ${p}` : ""))
        .filter(Boolean),
    };

    if (mode === "online") {
      answers["One-month test — what breaks"] = fears.filter(Boolean);
      answers["Time audit"] = audit
        .filter((r) => r.hrs || r.onlyMe || r.couldWait)
        .map(
          (r) =>
            `${r.act}: ${r.hrs || "?"}h/2wks${r.onlyMe ? " · only me" : ""}${r.couldWait ? " · could wait" : ""}`,
        );
      answers["The sort"] = sort
        .filter((r) => r.task)
        .map((r) => `${r.task} → ${r.fate || "?"}${r.step ? " (" + r.step + ")" : ""}`);
      const sopParts = [
        sop.task && `Task: ${sop.task}`,
        sop.trigger && `Trigger: ${sop.trigger}`,
        sop.steps && `Steps: ${sop.steps}`,
        sop.done && `Done looks like: ${sop.done}`,
        sop.ask && `Ask if stuck: ${sop.ask}`,
      ].filter(Boolean);
      if (sopParts.length) answers["One-page SOP"] = sopParts.join(" · ");
      answers["Handoff checklist"] = HANDOFF_ITEMS.filter((_, i) => handoff[i]);
    }

    try {
      await submitWorkbook({
        name: name.trim(),
        email: email.trim(),
        mode,
        constraint_text: constraint.trim() || undefined,
        cost_per_month: costMonth ? `£${costMonth}/month` : undefined,
        answers,
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const Header = (
    <header className="px-5 py-5">
      <div className="mx-auto max-w-content flex items-center justify-between">
        <Link to="/" aria-label="Outgrow Okay — home">
          <Lockup ground="ink" className="h-7" />
        </Link>
        <Link
          to="/insights"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          Insights
        </Link>
      </div>
    </header>
  );

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        {Header}
        <main className="flex-1 px-5 py-16">
          <div className="mx-auto max-w-prose text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-ink">
              <Check size={24} strokeWidth={2} aria-hidden />
            </span>
            <h1 className="mt-6 font-heading font-black text-2xl text-content">
              That's with me.
            </h1>
            <p className="mt-4 text-md text-muted">
              I'll read what you wrote and come back with an honest, specific read on your
              constraint and where I'd start. Check your inbox for a confirmation. No pitch,
              no obligation.
            </p>
            <div className="mt-8">
              <a
                href="https://calendar.app.google/nYF9YE9U84G44dNe8"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-accent px-6 py-3 font-heading font-bold text-base text-ink rounded-md hover:brightness-105 transition"
              >
                Or book a free 30-minute call →
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {Header}
      <main className="flex-1 px-5 py-12">
        <div className="mx-auto max-w-prose">
          <p className={KICKER}>The Bottleneck Workbook</p>
          <h1 className="mt-3 font-heading font-black text-2xl sm:text-3xl text-content">
            Get your business to run without you.
          </h1>
          <p className="mt-5 text-md text-muted max-w-prose">
            Fill it in here and request a free review — I'll read your answers and send back
            an honest, specific read on your one constraint. Already did it on paper? Switch
            to "enter my findings".
          </p>

          {/* Mode toggle */}
          <div className="mt-7 inline-flex rounded-md border border-line bg-surface p-1">
            {(["online", "paper"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "px-4 py-2 text-sm rounded transition-colors duration-fast " +
                  (mode === m ? "bg-accent text-ink font-bold" : "text-muted hover:text-content")
                }
              >
                {m === "online" ? "Fill it here" : "Enter my findings"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-10">
            {mode === "online" && (
              <>
                <Section n="01" kicker="Chapter one" title="You are the bottleneck"
                  lead="You disappear for a month. No phone. What specifically goes wrong? The fear is the data.">
                  {fears.map((v, i) => (
                    <div key={i} className="flex items-baseline gap-3">
                      <span className="num text-sm text-accent w-4 shrink-0">{i + 1}</span>
                      <input
                        className={LINE}
                        value={v}
                        onChange={(e) =>
                          setFears((p) => p.map((x, j) => (j === i ? e.target.value : x)))
                        }
                      />
                    </div>
                  ))}
                </Section>

                <Section n="02" kicker="Chapter two" title="Find your one constraint"
                  lead="From your real last fortnight — roughly where did the time go, and which of it is queuing behind you?">
                  <div className="space-y-3">
                    <div className="hidden sm:flex gap-3 text-xs text-faint num uppercase tracking-wide">
                      <span className="flex-1">Where the time went</span>
                      <span className="w-16 text-right">Hrs</span>
                      <span className="w-16 text-center">Only me</span>
                      <span className="w-20 text-center">Could wait</span>
                    </div>
                    {audit.map((r, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input
                          className={`${LINE} flex-1`}
                          value={r.act}
                          onChange={(e) =>
                            setAudit((p) => p.map((x, j) => (j === i ? { ...x, act: e.target.value } : x)))
                          }
                        />
                        <input
                          className={`${LINE} w-16 text-right num`}
                          inputMode="numeric"
                          value={r.hrs}
                          onChange={(e) =>
                            setAudit((p) => p.map((x, j) => (j === i ? { ...x, hrs: e.target.value } : x)))
                          }
                        />
                        <input
                          type="checkbox"
                          className="w-16 h-4 accent-accent"
                          style={{ accentColor: "var(--oo-accent)" }}
                          checked={r.onlyMe}
                          onChange={(e) =>
                            setAudit((p) => p.map((x, j) => (j === i ? { ...x, onlyMe: e.target.checked } : x)))
                          }
                          aria-label={`Only me: ${r.act}`}
                        />
                        <input
                          type="checkbox"
                          className="w-20 h-4"
                          style={{ accentColor: "var(--oo-accent)" }}
                          checked={r.couldWait}
                          onChange={(e) =>
                            setAudit((p) => p.map((x, j) => (j === i ? { ...x, couldWait: e.target.checked } : x)))
                          }
                          aria-label={`Could wait: ${r.act}`}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* The key artefact — always shown */}
            <Section kicker="Artefact 01" title="Your one constraint"
              lead="Finish the sentence. If it ran without you, it would free the most.">
              <textarea
                rows={2}
                className={FIELD}
                placeholder="The one thing that, if it ran without me, would free the most is…"
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
              />
            </Section>

            {mode === "online" && (
              <>
                <Section n="03" kicker="Chapter three" title="The &quot;only me&quot; inventory"
                  lead="List the work that depends on you, then give each a fate: Document, Delegate, Automate, or Delete.">
                  <div className="space-y-4">
                    {sort.map((r, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <input
                          className={`${LINE} flex-1`}
                          placeholder="Task only you do today"
                          value={r.task}
                          onChange={(e) => setSort((p) => p.map((x, j) => (j === i ? { ...x, task: e.target.value } : x)))}
                        />
                        <select
                          className={`${FIELD} sm:w-36 py-2`}
                          value={r.fate}
                          onChange={(e) => setSort((p) => p.map((x, j) => (j === i ? { ...x, fate: e.target.value } : x)))}
                        >
                          <option value="">Fate…</option>
                          {FATES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <input
                          className={`${LINE} sm:w-40`}
                          placeholder="First step"
                          value={r.step}
                          onChange={(e) => setSort((p) => p.map((x, j) => (j === i ? { ...x, step: e.target.value } : x)))}
                        />
                      </div>
                    ))}
                  </div>
                </Section>

                <Section n="04" kicker="Chapter four" title="The one-page SOP"
                  lead="Pick one task only you do. Write it so someone else could follow it.">
                  <div className="space-y-4">
                    <input className={LINE} placeholder="Task" value={sop.task} onChange={(e) => setSop({ ...sop, task: e.target.value })} />
                    <input className={LINE} placeholder="What triggers it" value={sop.trigger} onChange={(e) => setSop({ ...sop, trigger: e.target.value })} />
                    <textarea rows={4} className={FIELD} placeholder="Steps — numbered, plain verbs" value={sop.steps} onChange={(e) => setSop({ ...sop, steps: e.target.value })} />
                    <input className={LINE} placeholder="Done looks like…" value={sop.done} onChange={(e) => setSop({ ...sop, done: e.target.value })} />
                    <input className={LINE} placeholder="Who to ask if stuck" value={sop.ask} onChange={(e) => setSop({ ...sop, ask: e.target.value })} />
                  </div>
                </Section>

                <Section n="05" kicker="Chapter five" title="Handoffs that stick"
                  lead="A verbal handoff isn't a handoff — it's a loan. Tick what's true before you let go.">
                  <div className="space-y-3">
                    {HANDOFF_ITEMS.map((item, i) => (
                      <label key={i} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0"
                          style={{ accentColor: "var(--oo-accent)" }}
                          checked={handoff[i]}
                          onChange={(e) => setHandoff((p) => p.map((x, j) => (j === i ? e.target.checked : x)))}
                        />
                        <span className="text-md text-content">{item}</span>
                      </label>
                    ))}
                  </div>
                </Section>
              </>
            )}

            <Section kicker="Artefact 02" title="Your first handoff"
              lead="The one thing you'll hand off first — and who owns it.">
              <input
                className={LINE}
                placeholder="e.g. Quoting → Sam owns it, invoices out within 24h"
                value={handoffTask}
                onChange={(e) => setHandoffTask(e.target.value)}
              />
            </Section>

            <Section n={mode === "online" ? "06" : undefined} kicker="Artefact 03" title="What it's costing you"
              lead="Hours a week on work someone else could do × a fair hourly rate × 4.3 weeks.">
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm text-muted">
                  Hours / week
                  <input className={`${LINE} num w-24 mt-1`} inputMode="numeric" value={costHours} onChange={(e) => setCostHours(e.target.value)} />
                </label>
                <span className="text-faint pb-2">×</span>
                <label className="text-sm text-muted">
                  £ / hour
                  <input className={`${LINE} num w-24 mt-1`} inputMode="numeric" value={costRate} onChange={(e) => setCostRate(e.target.value)} />
                </label>
                <span className="text-faint pb-2">× 4.3 =</span>
                <div className="pb-1">
                  <span className="font-heading font-black text-2xl text-accent num">
                    {costMonth ? `£${costMonth}` : "£—"}
                  </span>
                  <span className="text-sm text-muted"> / month</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-faint">
                Example: 9h × £22 × 4.3 ≈ £850/month — about £10,200 a year of your time on £22 work.
              </p>
            </Section>

            <Section kicker="Artefact 04" title="Your next 30 days"
              lead="One constraint, one handoff, one habit. Small and finished beats big and abandoned.">
              <div className="space-y-3">
                {["Week 1 — Document one SOP", "Week 2 — Hand one thing off", "Week 3 — Automate or delete one thing", "Week 4 — Take a day fully out"].map(
                  (label, i) => (
                    <div key={i}>
                      <span className="num text-xs text-accent uppercase tracking-wide">{label}</span>
                      <input
                        className={LINE}
                        value={plan[i]}
                        onChange={(e) => setPlan((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                    </div>
                  ),
                )}
              </div>
            </Section>

            {/* Submit */}
            <div className="border-t border-line pt-8 mt-10">
              <h3 className={H3}>Request your free review</h3>
              <p className="mt-2 text-sm text-muted">
                I'll read your answers and reply with where I'd start. No pitch, no obligation.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <input className={FIELD} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className={FIELD} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              {error && (
                <p className="mt-4 text-sm" style={{ color: "var(--oo-neg)" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent px-6 py-3.5 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
              >
                {busy ? <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden /> : null}
                {busy ? "Sending…" : "Request review"}
              </button>
              <p className="mt-3 text-xs text-faint">
                Prefer to talk? <a href="https://calendar.app.google/nYF9YE9U84G44dNe8" target="_blank" rel="noreferrer" className="text-accent hover:underline">Book a free 30-minute call</a> — straight to a calendar, no payment.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

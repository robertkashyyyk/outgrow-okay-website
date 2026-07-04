import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Wand2, AlertCircle, Calendar } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { startBatch } from "../../../lib/studio-insights";
import type { Insight } from "../../../types/insight";

const FIELD =
  "w-full bg-surface border border-line rounded-md px-4 py-3 text-base " +
  "text-content placeholder:text-faint transition-colors duration-fast focus:border-accent";
const LABEL = "block text-sm text-muted mb-2";

// Scheduling helpers (pure Date math) ---------------------------------------

function getUKNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
}
function isoDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// One slot per weekday at 14:00; skip dates that already hold a post.
function computeAvailableSlots(existing: Insight[]): Date[] {
  const now = getUKNow();
  const today = isoDateKey(now);
  const todayHr = now.getHours();
  const weekday = now.getDay();

  const occupied = new Set(
    existing
      .filter((p) => (p.status === "scheduled" || p.status === "published") && p.scheduled_at)
      .map((p) => p.scheduled_at!.split("T")[0]),
  );

  function slotsForWeek(offset: number): Date[] {
    const slots: Date[] = [];
    const daysFromMon = weekday === 0 ? 6 : weekday - 1;
    for (let d = 0; d < 5; d++) {
      const slot = new Date(now);
      slot.setDate(now.getDate() - daysFromMon + offset * 7 + d);
      slot.setHours(14, 0, 0, 0);
      const key = isoDateKey(slot);
      if (occupied.has(key)) continue;
      if (offset === 0) {
        if (key < today) continue;
        if (key === today && todayHr >= 14) continue;
      }
      slots.push(slot);
    }
    return slots;
  }

  const isWeekend = weekday === 0 || weekday === 6;
  if (!isWeekend) {
    const thisWeek = slotsForWeek(0);
    if (thisWeek.length > 0) return thisWeek;
  }
  return slotsForWeek(1);
}

function formatSlot(d: Date): string {
  return (
    d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) +
    " at 14:00"
  );
}
function weekLabel(slots: Date[]): string {
  if (!slots.length) return "";
  const first = slots[0];
  const mon = new Date(first);
  const daysFromMon = first.getDay() === 0 ? 6 : first.getDay() - 1;
  mon.setDate(first.getDate() - daysFromMon);
  return `w/c ${mon.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}
function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDateKey(d);
}
// Mon–Fri 14:00 slots for the picked week, minus any weekday that already holds
// a post. Works for any week — past OR future. A future-dated slot, saved as a
// published post, stays hidden until its date passes and then appears on its own
// (public RLS: status='published' AND published_at <= now). That's the scheduling.
function computeWeekSlots(mondayStr: string, existing: Insight[]): Date[] {
  if (!mondayStr) return [];
  const occupied = new Set(
    existing
      .filter((p) => p.published_at || p.scheduled_at)
      .map((p) => (p.published_at ?? p.scheduled_at)!.split("T")[0]),
  );
  const slots: Date[] = [];
  for (let d = 0; d < 5; d++) {
    const slot = new Date(mondayStr + "T14:00:00");
    slot.setDate(slot.getDate() + d);
    if (!occupied.has(isoDateKey(slot))) slots.push(slot);
  }
  return slots;
}

export function ContentEngine() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState("");
  const [slots, setSlots] = useState<Date[]>([]);
  const [existing, setExisting] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fired, setFired] = useState(false);
  const [pickWeek, setPickWeek] = useState(false);
  const [weekDate, setWeekDate] = useState("");

  const pickedMonday = weekDate ? getMondayOfWeek(weekDate) : "";
  const weekSlots = computeWeekSlots(pickedMonday, existing);
  const activeSlots = pickWeek ? weekSlots : slots;
  // Any slot still in the future means the batch schedules (appears on its day)
  // rather than going live immediately.
  const hasFutureSlot = weekSlots.some((s) => s.getTime() > Date.now());

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, status, scheduled_at, published_at")
        .in("status", ["scheduled", "published", "pending_review"]);
      if (!active) return;
      const posts = (data ?? []) as Insight[];
      setExisting(posts);
      setSlots(computeAvailableSlots(posts));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleGenerate() {
    if (!theme.trim()) {
      setError("Describe your theme first.");
      return;
    }
    if (pickWeek && !weekDate) {
      setError("Pick a date in the week you want.");
      return;
    }
    if (activeSlots.length === 0) {
      setError(
        pickWeek
          ? "No open slots that week — every weekday already has a post."
          : "No open slots this week.",
      );
      return;
    }

    setFired(true);
    setError(null);
    try {
      await startBatch({
        theme: theme.trim(),
        slots: activeSlots.map((s) => s.toISOString()),
        previousTitles: existing.map((p) => p.title).filter(Boolean),
        // Past weeks backfill: saved published with their past date, live at once.
        // Future/current weeks go through review instead — saved Pending review with
        // a scheduled_at, so nothing goes live until you publish it yourself.
        backfill: pickWeek && !hasFutureSlot,
      });
    } catch {
      /* keepalive fetch — the job runs server-side regardless */
    }
    navigate("/studio/insights");
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="max-w-prose">
      <Link
        to="/studio/insights"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        All insights
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface border border-line">
          <Wand2 size={17} strokeWidth={1.5} className="text-content" aria-hidden />
        </span>
        <div>
          <h1 className="font-heading font-black text-xl sm:text-2xl text-content">
            Content engine
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {pickWeek
              ? weekDate
                ? `${weekSlots.length} slot${weekSlots.length !== 1 ? "s" : ""} — ${weekLabel(weekSlots)}`
                : "Pick any week — past or future"
              : `${slots.length} slot${slots.length !== 1 ? "s" : ""} open — ${weekLabel(slots) || "next week"}`}
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {/* Slots panel */}
        {pickWeek ? (
          <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
            <div>
              <label htmlFor="week" className={LABEL}>
                Pick any day in the target week
              </label>
              <input
                id="week"
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className={`${FIELD} num w-auto`}
              />
            </div>
            {weekSlots.length > 0 && (
              <div>
                <p className="text-sm text-muted mb-2">
                  {hasFutureSlot ? "Will queue for review, dated:" : "Will publish posts dated:"}
                </p>
                <ul className="space-y-1.5">
                  {weekSlots.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-faint">
                      <Calendar size={13} strokeWidth={1.5} className="shrink-0" aria-hidden />
                      {formatSlot(s)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weekDate && weekSlots.length === 0 && (
              <p className="text-sm text-faint">All weekdays that week already have posts.</p>
            )}
          </div>
        ) : slots.length > 0 ? (
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-sm text-muted mb-2">Will schedule posts on:</p>
            <ul className="space-y-1.5">
              {slots.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-faint">
                  <Calendar size={13} strokeWidth={1.5} className="shrink-0" aria-hidden />
                  {formatSlot(s)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-sm text-muted">
              All slots this week are full. Pick a specific week below to go further out.
            </p>
          </div>
        )}

        {/* Theme */}
        <div>
          <label htmlFor="theme" className={LABEL}>
            Theme &amp; angles
          </label>
          <textarea
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={`Describe the theme and specific angles for this batch.\n\nExample:\n"Getting out of the day-to-day:\n- The quoting process only you understand\n- When to write an SOP vs automate it\n- The first three tasks to hand to an AI agent"`}
            rows={10}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </div>

        {error && (
          <div
            className="flex items-center gap-3 rounded-md border border-line p-4 text-sm"
            style={{ color: "var(--oo-neg)" }}
          >
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={() => void handleGenerate()}
          disabled={activeSlots.length === 0 || !theme.trim() || fired || (pickWeek && !weekDate)}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent px-6 py-4 font-heading font-bold text-base text-ink rounded-md transition-transform duration-fast ease-out motion-safe:active:scale-[0.99] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 size={18} strokeWidth={2} aria-hidden />
          {pickWeek
            ? `Generate ${activeSlots.length} post${activeSlots.length !== 1 ? "s" : ""}${weekDate ? ` — ${weekLabel(weekSlots)}` : ""}`
            : `Generate ${activeSlots.length} post${activeSlots.length !== 1 ? "s" : ""} for ${weekLabel(slots) || "next week"}`}
        </button>

        <div className="text-center">
          <button
            onClick={() => {
              setPickWeek((m) => !m);
              setWeekDate("");
              setError(null);
            }}
            className="text-sm text-faint hover:text-content underline underline-offset-2 transition-colors duration-fast"
          >
            {pickWeek ? "← Back to next open slots" : "Pick a specific week (future or past)"}
          </button>
        </div>

        <p className="text-sm text-faint text-center">
          {pickWeek
            ? hasFutureSlot
              ? "Posts are saved as Pending review, dated for that week — review and publish them yourself; nothing goes live until you do."
              : "Posts are saved as published with past dates — they appear on Insights immediately."
            : "New posts are saved as Pending for your review, then scheduled. Generation runs in the background — they'll appear in the list as they're written."}
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Video, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Lockup } from "../components/Logo";
import { useGround } from "../components/useGround";

// Booking flow. Reuses the same Supabase Edge Functions + Google Calendar config
// as the Kashyyyk site (Outgrow Okay is a trading name of Kashyyyk Ltd) — only the
// skin and voice change. Slot logic is identical: weekday 09–16 UK time, 14-day
// window, live availability via list-calendar-events, booking via create-booking.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16];

interface CalEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface DaySlots {
  date: Date;
  slots: Date[];
}

function formatSlotTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}
function formatDayLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
function formatConfirmDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function slotOverlaps(slot: Date, events: CalEvent[]): boolean {
  const slotEnd = new Date(slot.getTime() + 60 * 60 * 1000);
  return events.some((ev) => {
    const start = ev.start.dateTime ? new Date(ev.start.dateTime) : null;
    const end = ev.end.dateTime ? new Date(ev.end.dateTime) : null;
    if (!start || !end) return false;
    return start < slotEnd && end > slot;
  });
}

function buildAvailableSlots(events: CalEvent[]): DaySlots[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: DaySlots[] = [];

  for (let i = 1; i <= 14; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const available: Date[] = [];
    for (const h of SLOT_HOURS) {
      const slot = new Date(day);
      slot.setHours(h, 0, 0, 0);
      if (!slotOverlaps(slot, events)) available.push(slot);
    }
    if (available.length > 0) result.push({ date: day, slots: available });
  }
  return result;
}

const FIELD_CLASS =
  "w-full box-border rounded-md border border-line bg-surface px-4 py-3 " +
  "text-base text-content placeholder:text-faint outline-none " +
  "transition-colors duration-fast focus:border-accent";

const LABEL_CLASS = "eyebrow block mb-2 text-muted";

export function Book() {
  useGround("dark");

  const [days, setDays] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [calError, setCalError] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", business: "", challenge: "" });
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<{ meetLink: string | null; slot: Date } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const tMin = now.toISOString();
        const tMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

        const res = await fetch(`${SUPABASE_URL}/functions/v1/list-calendar-events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({ timeMin: tMin, timeMax: tMax }),
        });
        const events = await res.json();
        if (!Array.isArray(events)) throw new Error("bad response");
        setDays(buildAvailableSlots(events as CalEvent[]));
      } catch {
        setCalError(true);
        setDays(buildAvailableSlots([]));
      }
      setLoading(false);
    }
    load();
  }, []);

  const DAYS_PER_PAGE = 5;
  const visibleDays = days.slice(weekOffset * DAYS_PER_PAGE, (weekOffset + 1) * DAYS_PER_PAGE);
  const totalPages = Math.ceil(days.length / DAYS_PER_PAGE);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          business_name: form.business.trim() || null,
          challenge: form.challenge.trim() || null,
          scheduled_at: selected.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBooking({ meetLink: data.meet_link ?? null, slot: selected });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  // Minimal header — wordmark only, matches the rest of the site.
  const PageHeader = (
    <header className="px-5 py-5">
      <div className="mx-auto max-w-content">
        <Link to="/" aria-label="Outgrow Okay — home">
          <Lockup ground="ink" className="h-7" />
        </Link>
      </div>
    </header>
  );

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (booking) {
    return (
      <div className="min-h-screen">
        {PageHeader}
        <main className="px-5 py-10">
          <div className="mx-auto max-w-prose text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-line">
              <Check size={24} strokeWidth={1.5} className="text-pos" aria-hidden />
            </div>
            <p className="eyebrow text-muted">You&rsquo;re booked in</p>
            <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
              Discovery call confirmed.
            </h1>
            <p className="num mt-5 text-md text-muted">
              {formatConfirmDate(booking.slot)} at {formatSlotTime(booking.slot)}
            </p>
            {booking.meetLink && (
              <p className="mt-2 text-base text-faint">
                A confirmation email with the Meet link is on its way.
              </p>
            )}
            {booking.meetLink && (
              <a
                href={booking.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-4 font-heading font-bold text-base text-ink transition-transform duration-fast ease-out hover:brightness-105 motion-safe:active:scale-[0.97]"
              >
                <Video size={16} strokeWidth={1.5} /> Join Google Meet
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Main booking UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {PageHeader}

      <main className="px-5 py-9">
        <div className="mx-auto max-w-content">
          <p className="eyebrow text-muted">Free · no pitch</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Book a discovery call.
          </h1>
          <p className="mt-5 max-w-prose text-md text-muted">
            Twenty minutes, straight talking. We&rsquo;ll dig into your business and where it
            could go &mdash; no slides, no pitch. If we&rsquo;re a fit, you&rsquo;ll know.
          </p>

          <div className="mt-9 grid gap-10 border-t border-line pt-8 sm:grid-cols-2">
            {/* Slot picker */}
            <div>
              <h2 className="font-heading font-bold text-lg text-content">Choose a time</h2>
              <p className="mt-1 text-base text-faint">All times shown in UK time (GMT/BST).</p>

              {loading ? (
                <div className="mt-7 flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-md bg-surface motion-safe:animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="mt-7">
                  {calError && (
                    <div className="mb-5 rounded-md border-l-2 border-warn bg-surface px-4 py-3">
                      <p className="text-base text-muted">
                        Live availability could not be loaded &mdash; showing indicative slots.
                        We&rsquo;ll confirm your time by email.
                      </p>
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="mb-5 flex items-center justify-between">
                      <button
                        onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                        disabled={weekOffset === 0}
                        aria-label="Previous week"
                        className="rounded-sm border border-line px-2 py-2 text-content transition-colors duration-fast hover:border-accent disabled:opacity-40 disabled:hover:border-line"
                      >
                        <ChevronLeft size={16} strokeWidth={1.5} />
                      </button>
                      <p className="num text-base text-faint">
                        Week {weekOffset + 1} of {totalPages}
                      </p>
                      <button
                        onClick={() => setWeekOffset((o) => Math.min(totalPages - 1, o + 1))}
                        disabled={weekOffset >= totalPages - 1}
                        aria-label="Next week"
                        className="rounded-sm border border-line px-2 py-2 text-content transition-colors duration-fast hover:border-accent disabled:opacity-40 disabled:hover:border-line"
                      >
                        <ChevronRight size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}

                  {visibleDays.length === 0 ? (
                    <p className="py-8 text-center text-base text-muted">
                      No available slots in this period. Please get in touch directly.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {visibleDays.map(({ date, slots }) => (
                        <div key={date.toISOString()}>
                          <p className="eyebrow mb-3 text-faint">{formatDayLabel(date)}</p>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => {
                              const isSelected = selected?.toISOString() === slot.toISOString();
                              return (
                                <button
                                  key={slot.toISOString()}
                                  onClick={() => setSelected(isSelected ? null : slot)}
                                  className={
                                    "num rounded-sm border px-4 py-2 text-base transition-colors duration-fast " +
                                    (isSelected
                                      ? "border-accent bg-surface text-content"
                                      : "border-line text-muted hover:border-accent hover:text-content")
                                  }
                                >
                                  {formatSlotTime(slot)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Booking form */}
            <div>
              <h2 className="font-heading font-bold text-lg text-content">Your details</h2>
              {selected ? (
                <p className="num mt-1 text-base text-content">
                  Selected: {formatDayLabel(selected)} at {formatSlotTime(selected)}
                </p>
              ) : (
                <p className="mt-1 text-base text-faint">Select a time slot to complete your booking.</p>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-7 flex flex-col gap-4 transition-opacity duration-base"
                style={{ opacity: selected ? 1 : 0.5, pointerEvents: selected ? "auto" : "none" }}
              >
                <div>
                  <label className={LABEL_CLASS}>Your name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                    disabled={!selected || submitting}
                    placeholder="Jane Smith"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Email address *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    required
                    disabled={!selected || submitting}
                    placeholder="jane@company.com"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Business name</label>
                  <input
                    name="business"
                    value={form.business}
                    onChange={onChange}
                    disabled={!selected || submitting}
                    placeholder="Acme Ltd"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>What&rsquo;s the main challenge you&rsquo;re facing?</label>
                  <textarea
                    name="challenge"
                    value={form.challenge}
                    onChange={onChange}
                    rows={4}
                    disabled={!selected || submitting}
                    placeholder="Tell us a bit about what&rsquo;s on your mind…"
                    className={FIELD_CLASS + " min-h-[100px] resize-y"}
                  />
                </div>
                {submitError && <p className="text-base text-neg">{submitError}</p>}
                <button
                  type="submit"
                  disabled={!selected || submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-4 font-heading font-bold text-base text-ink transition-all duration-fast ease-out hover:brightness-105 motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Booking…" : (<>Confirm booking <ArrowRight size={16} strokeWidth={1.5} /></>)}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

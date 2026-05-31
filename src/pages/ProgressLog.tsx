import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Lockup } from "../components/Logo";
import { useGround } from "../components/useGround";

type Status = "shipped" | "open" | "planned";

function StatusTag({ status }: { status: Status }) {
  const map: Record<Status, { label: string; color: string }> = {
    shipped: { label: "Shipped", color: "var(--oo-pos)" },
    open: { label: "Open", color: "var(--oo-warn)" },
    planned: { label: "Planned", color: "var(--oo-grey-400)" },
  };
  const { label, color } = map[status];
  return (
    <span
      className="num inline-flex items-center gap-2 text-xs uppercase tracking-wide"
      style={{ color }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

const changelog: { date: string; items: string[] }[] = [
  {
    date: "2026-05-31",
    items: [
      "Insights reader live (/insights + /insights/:slug) — public long-form index and article pages, reading from Outgrow Okay's own Supabase (blog_posts table, public-read RLS for live published posts only). Markdown is rendered via react-markdown into a token-styled article wrapper; accent stays reserved.",
      "Insight back-catalogue migrated — all 65 articles from the old Kashyyyk studio imported into OO (60 published + 5 scheduled). Original publish dates preserved; leading duplicate H1s stripped. Cover images deferred — imported without covers to avoid hotlinking Kashyyyk storage; they'll be re-hosted into OO storage in Phase 2.",
      "Booking backend separated — create-booking and list-calendar-events now run in OO's own Supabase project (no longer Kashyyyk's), sending the OO-branded confirmation email from outgrowokay.com. create-booking hardened to surface calendar/insert/email failures instead of swallowing them, and now reports email_sent in its response.",
      "Privacy page live (/privacy) — plain-English, grounded in the only data the site collects (the discovery-call booking form). No analytics or tracking. The footer Privacy link now points to it.",
      "Brand styleguide prepared for brand.outgrowokay.com — the Manus-built styleguide stripped of all telemetry (debug-collector, the inline manus-runtime, manus-analytics) and the duplicated logo dir, then verified rendering as a clean self-contained static site in its own repo (outgrow-okay-brand).",
      "Logo + favicon fixed — the OO monogram now renders as two true O's via clipPath transparency (it was showing as facing crescents on any non-matching background); favicon path corrected to /brand/favicon.svg; OUTGROW set to Archivo Black (900).",
      "Proof strips aligned — reserved a two-line figure height so the label and body areas anchor to the same baseline across all three columns.",
      "Nav tidy — Progress Log removed from the public footer; Insights placed in its slot. This log stays reachable directly.",
    ],
  },
  {
    date: "2026-05-30",
    items: [
      "Booking page (/book) — discovery-call flow live. Reuses the existing Kashyyyk Google Calendar booking system unchanged (same Supabase Edge Functions, same settings), re-skinned to Outgrow Okay: ink ground, ink-on-accent CTA, Archivo/IBM Plex, plain-talking voice. Both homepage CTAs now route here.",
      "Project scaffolded — Vite + React 18 + TS + Tailwind 3, in its own repo.",
      "Token foundation — tokens.json → CSS variables (--oo-*) referenced through the Tailwind config. No hardcoded hex; dark/light grounds switch via .dark on <html>.",
      "Fonts wired — Archivo (300/700/900), IBM Plex Sans (400/600), IBM Plex Mono (400/600). tabular-nums on every figure.",
      "Brand assets + Lockup / Wordmark / Monogram components, rendered straight from the SVG source.",
      "Homepage — eight funnel sections + footer, copy verbatim from the handoff. Accent limited to the CTA, the 1% → 15% stat, and the stage prices.",
      "Routing added (react-router-dom) — Home on the dark ground, this Progress Log on the bone long-read ground.",
    ],
  },
];

const openItems: { title: string; status: Status; note: string }[] = [
  {
    title: "Wordmark weight: 700 vs 900",
    status: "shipped",
    note: "Resolved — OUTGROW now renders in Archivo Black (900) per the brief. Favicon legibility was the same issue and is fixed too: the monogram now uses clipPath transparency for two true O's, so it holds up at 16px.",
  },
  {
    title: "Scheduled insights have no scheduler yet",
    status: "open",
    note: "5 of the 65 migrated articles are status=scheduled with future publish dates, but OO has no cron to flip them live. For now they stay hidden from the public reader (RLS only serves published posts with a past published_at). Either flip them manually or wait for the Phase 2 pipeline to own scheduling.",
  },
  {
    title: "Footer links: LinkedIn + Contact",
    status: "open",
    note: "Privacy and Insights now point somewhere real. LinkedIn and Contact are still placeholder anchors — Contact lands when the contact route ships; LinkedIn needs the real profile URL.",
  },
];

const roadmap: { title: string; status: Status; note: string }[] = [
  {
    title: "Brand guidelines site",
    status: "shipped",
    note: "Live at brand.outgrowokay.com — the cleaned, de-telemetried styleguide deployed as its own DigitalOcean static site from the outgrow-okay-brand repo. DNS is managed in DO (the registrar is GoDaddy but nameservers point at DO), so the subdomain and SSL were wired automatically.",
  },
  {
    title: "Insight generation pipeline (Phase 2)",
    status: "planned",
    note: "Port + rebrand the old Kashyyyk blog generation and assistant edge functions into OO's voice, re-host the ~65 cover images into OO storage (deferred from the migration), and add the gated Studio editor. Newsletter follows in Phase 4.",
  },
  {
    title: "Bone long-read pages",
    status: "planned",
    note: "Secondary/content pages (about, method, the full case study) on the bone ground — same tokens, no fork.",
  },
  {
    title: "Studio dashboard",
    status: "planned",
    note: "Functional dashboard on the grey-100 ground. Verify accent vs warn distinctness here — both are warm browns.",
  },
  {
    title: "Case study page",
    status: "planned",
    note: "The 1% → 15% automotive-ecommerce story. Pending the founder's call on naming the client vs. staying anonymised.",
  },
  {
    title: "Contact route + form",
    status: "planned",
    note: "A way in for people who aren't ready to book yet.",
  },
  {
    title: "Terms page",
    status: "planned",
    note: "Privacy is live (/privacy). Terms still to write.",
  },
  {
    title: "Hosting, CI deploy + DNS cutover",
    status: "planned",
    note: "Deploy from GitHub to DigitalOcean; point outgrowokay.com (GoDaddy DNS) at it.",
  },
  {
    title: "Analytics + SEO / OpenGraph",
    status: "planned",
    note: "Privacy-respecting analytics and share/meta tags.",
  },
];

export function ProgressLog() {
  useGround("light");
  return (
    <div className="min-h-screen">
      <header className="px-5 py-5">
        <div className="mx-auto max-w-content flex items-center justify-between">
          <Link to="/" aria-label="Outgrow Okay — home">
            <Lockup ground="bone" className="h-7" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            Home
          </Link>
        </div>
      </header>

      <main className="px-5 py-9">
        <div className="mx-auto max-w-content">
          <p className="eyebrow">Internal · build journal</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            Progress Log
          </h1>
          <p className="mt-5 max-w-prose text-md text-muted">
            A running record of what&rsquo;s been built, the decisions still
            open, and the larger areas left to build. Updated as we go.
          </p>

          {/* Changelog */}
          <section className="mt-9 border-t border-line pt-7">
            <h2 className="font-heading font-bold text-lg text-content">
              Built &amp; changed
            </h2>
            {changelog.map((entry) => (
              <div key={entry.date} className="mt-6">
                <div className="flex items-center gap-3">
                  <span className="num text-sm text-faint">{entry.date}</span>
                  <StatusTag status="shipped" />
                </div>
                <ul className="mt-3 space-y-2 max-w-prose">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-base text-muted">
                      <span aria-hidden className="text-faint">
                        &mdash;
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* Open items */}
          <section className="mt-9 border-t border-line pt-7">
            <h2 className="font-heading font-bold text-lg text-content">
              Open decisions
            </h2>
            <div className="mt-6 space-y-5">
              {openItems.map((item) => (
                <div key={item.title} className="max-w-prose">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-heading font-bold text-md text-content">
                      {item.title}
                    </h3>
                    <StatusTag status={item.status} />
                  </div>
                  <p className="mt-2 text-base text-muted">{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Roadmap */}
          <section className="mt-9 border-t border-line pt-7">
            <h2 className="font-heading font-bold text-lg text-content">
              Larger areas to build
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {roadmap.map((item) => (
                <div
                  key={item.title}
                  className="border border-line rounded-lg p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-heading font-bold text-md text-content">
                      {item.title}
                    </h3>
                    <StatusTag status={item.status} />
                  </div>
                  <p className="mt-2 text-base text-muted">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

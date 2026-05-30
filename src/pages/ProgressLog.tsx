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
    date: "2026-05-30",
    items: [
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
    title: "Favicon legibility at 16px",
    status: "open",
    note: "The OO monogram uses two thin-stroke circles with a real gap. At favicon size the strokes are thin — borderline. Revisit in a real browser tab; may need a heavier-stroke favicon-only variant.",
  },
  {
    title: "Wordmark weight: 700 vs 900",
    status: "open",
    note: "The brief specifies OUTGROW in Archivo Black (900). The delivered wordmark/lockup SVGs render OUTGROW at 700. Using the SVGs as supplied — flagged for a decision.",
  },
  {
    title: "CTA booking target",
    status: "open",
    note: "Both “Book a discovery call” buttons point to the #book section as a placeholder. Needs a real booking URL (Cal.com / Calendly / custom).",
  },
];

const roadmap: { title: string; status: Status; note: string }[] = [
  {
    title: "Booking / discovery-call flow",
    status: "planned",
    note: "Wire the canonical CTA to a real scheduling tool.",
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
    title: "Legal pages",
    status: "planned",
    note: "Privacy + terms. Footer LinkedIn / Privacy / Contact links are placeholders for now.",
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

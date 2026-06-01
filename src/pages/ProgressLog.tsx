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
    date: "2026-06-01",
    items: [
      "Clients + Contacts — the lighter CRM foundation (Phase 3, part 1). Two new tables: clients (the company/account — status, industry, website, package, notes) and contacts (the people at that company — name, role, email, phone, with a primary flag). Both are admin-only behind is_admin() RLS; contacts cascade-delete with their client. In the Studio: a filterable client list, a client detail screen with a full contacts section (add / edit / remove inline, mark primary), and a new/edit client form. A client with no package or retainer is simply 'Ad hoc'; named packages map to the Find / Change / Move stages. Provisioning was folded in — the old standalone 'invite a client' page is gone, replaced by an 'Invite to Portal' action on each contact that reuses the existing provision-account function and links the contact to their Portal login. This is deliberately built before Tasks, because a task has to belong to a contact — contacts are the connective tissue everything else hangs off.",
    ],
  },
  {
    date: "2026-05-31",
    items: [
      "Insights reading polish — three fixes. (1) Pages now always open at the top: React Router was keeping the previous page's scroll position, so a post could open near its footer and the long index opened halfway down; a ScrollToTop now resets on every route change and the browser's own scroll restoration is turned off. (2) The index is paginated (12 per page, Newer/Older controls) instead of rendering all 60+ articles in one endless scroll. (3) The cover image returns to the top of each article — sitting behind the title at low opacity and fading into the ink ground, the hero treatment carried over from the Kashyyyk version.",
      "Back-catalogue covers re-hosted — the 65 migrated articles were imported without covers to avoid hotlinking the old Kashyyyk/legacy storage. Their original cover images are now copied into OO's own blog-images bucket (covers/migrated/) and every post repointed at the OO-hosted URL, so the Insights index and articles render with art and OO no longer depends on another project's storage. The 2 OO-native posts have no legacy source — they'll get fresh covers from the gpt-image-1 engine.",
      "Insights AI engine live (Phase 2c-3) — a Studio 'Content engine' generates a week's worth of posts from a single theme: Claude Opus writes each one in OO's voice (banned-opener rules carried over so they don't all start 'Many businesses…'), then gpt-image-1 paints a cover in the bone/ink + restrained-ochre house style and stores it in OO. Posts land as Pending for review (or Published when backfilling a past week), scheduled one per weekday at 14:00 onto open dates. Runs in the background via a generation_jobs row; the Insights list shows a live progress bar and refreshes itself when the batch finishes. All AI functions are admin-gated server-side — a logged-in customer gets a 403, so nobody can burn API tokens. Verified end to end.",
      "Insights AI assist (Phase 2c-2) — in the editor: a 'Generate with AI' cover button, a one-click tag suggester, and a collapsible writing assistant (ask → append / replace) that sees the current draft as context. Backed by two new edge functions — blog-assistant (assist / tags / newsletter modes, Claude) and generate-blog-image (gpt-image-1). DALL·E 3 turned out not to be available on the new key, so images use gpt-image-1 (base64 → OO storage). The newsletter mode is built and waiting for Phase 4.",
      "Insights editor live in the Studio (Phase 2c-1) — admin-only list + editor over the blog_posts catalogue (62 published, 5 scheduled). Create, edit, publish, schedule, delete, cover-image upload, and a one-click 'go live' for scheduled posts. Admins write directly with their authenticated session — new RLS policies (is_admin()) grant full access while the public still only ever sees live published posts. Cover uploads land in a new public blog-images storage bucket.",
      "Auth + roles foundation (Phase 2a) — one Supabase Auth login for everyone (/login); role on the profiles row decides the destination (admin → Studio, customer → Portal). AuthProvider + AuthGuard enforce session and role client-side; RLS + an is_admin() helper and a role-protection trigger are the real gate. Shared AppShell chrome backs both the Studio and Portal areas.",
      "No public self-registration (Phase 2a) — the sign-up UI and the client signUp capability were removed, and new signups are disabled at the Supabase project level. Accounts are created only by an admin or, later, by the booking flow.",
      "Admin client provisioning (Phase 2b) — a Studio → Clients screen invites a client by email. The provision-account edge function (admin-gated; also callable service-to-service) mints a Supabase invite link without using Supabase's mailer, then sends an OO-branded invite via Resend from hello@outgrowokay.com. The invitee lands on /welcome already signed in and sets their own password — no password is ever handled client-side. Verified end to end.",
      "Insights reader live (/insights + /insights/:slug) — public long-form index and article pages, reading from Outgrow Okay's own Supabase (blog_posts table, public-read RLS for live published posts only). Markdown is rendered via react-markdown into a token-styled article wrapper; accent stays reserved.",
      "Insight back-catalogue migrated — all 65 articles from the old Kashyyyk studio imported into OO (60 published + 5 scheduled). Original publish dates preserved; leading duplicate H1s stripped. Covers were imported empty to avoid hotlinking Kashyyyk storage, then re-hosted into OO storage later the same day (see top of log).",
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
    status: "shipped",
    note: "Done: the gated Studio editor, the AI writing assistant + tag suggester, on-brand cover generation (gpt-image-1), the Content engine that batch-writes a week of posts, and the 65 migrated back-catalogue covers re-hosted into OO storage. Still outstanding: the newsletter (built in blog-assistant, surfaces in Phase 4).",
  },
  {
    title: "Calls & Tasks pipeline (Phase 3)",
    status: "planned",
    note: "Promote a booked discovery call into a first-class 'call' both sides can see — upcoming in the client's Portal, scheduled in the Studio. After the Google Meet, the Gemini transcript (which lands in the founder's inbox) gets ingested into OO — open decision: Gmail API watch vs. a forwarding rule into an inbound endpoint, since either touches email. The transcript is then run through Claude (server-side edge function, key never client-side) to produce clean meeting notes plus two action lists: ours and the client's. Our actions flow into a Studio Tasks module; the client's surface in their Portal with a download they can take to their own task manager. The Portal then also becomes an accountability view — what the client still needs to complete and return. Build order: Tasks model first (it's the backbone), then the call object (small extension of bookings), then transcript → AI notes (the heaviest piece).",
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

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Lockup } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { useGround } from "../components/useGround";

// Privacy — plain-English, grounded in what the site actually does. The only place
// Outgrow Okay collects personal data is the discovery-call booking form (/book);
// there's no analytics, tracking, or newsletter yet. Bone long-read ground.
// Last reviewed: 2026-05-31.
const LAST_UPDATED = "31 May 2026";

export function Privacy() {
  useGround("light");
  return (
    <div className="min-h-screen flex flex-col">
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

      <main className="flex-1 px-5 py-9">
        <div className="mx-auto max-w-prose">
          <p className="eyebrow">Privacy</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
            What we collect, and what we do with it.
          </h1>
          <p className="num mt-5 text-sm text-faint uppercase tracking-wide">
            Last updated {LAST_UPDATED}
          </p>

          <div className="oo-article mt-9">
            <p>
              Outgrow Okay is a trading name of <strong>Kashyyyk Ltd</strong>, a
              company registered in Northern Ireland. This page explains, in plain
              terms, the personal information we collect through this website and
              how we handle it. If anything here is unclear, email us at{" "}
              <a href="mailto:hello@kashyyyk.co.uk">hello@kashyyyk.co.uk</a>.
            </p>

            <h2>The short version</h2>
            <p>
              The only place this site asks for your details is the discovery-call
              booking form. We don&rsquo;t run advertising trackers, we don&rsquo;t
              sell or share your data, and we don&rsquo;t send marketing you
              haven&rsquo;t asked for. We collect what we need to hold the call you
              booked &mdash; nothing more.
            </p>

            <h2>What we collect</h2>
            <p>
              When you book a discovery call at{" "}
              <Link to="/book">/book</Link>, we collect:
            </p>
            <ul>
              <li>
                <strong>Your name and email address</strong> &mdash; so we know who
                we&rsquo;re meeting and can send the confirmation.
              </li>
              <li>
                <strong>Your business name</strong> (optional) &mdash; context for
                the call.
              </li>
              <li>
                <strong>The challenge you describe</strong> (optional) &mdash; so the
                conversation is useful from the first minute.
              </li>
              <li>
                <strong>The date and time you choose.</strong>
              </li>
            </ul>
            <p>
              Reading our Insights articles collects nothing about you. The site
              uses only the essential cookies a browser needs to load pages &mdash;
              no analytics or tracking cookies at this time.
            </p>

            <h2>Why we use it, and our lawful basis</h2>
            <p>
              We use these details solely to arrange, confirm and prepare for the
              call you requested. Our lawful basis is taking steps at your request
              before potentially entering into a contract, and our legitimate
              interest in responding to enquiries. We won&rsquo;t add you to a
              mailing list off the back of a booking.
            </p>

            <h2>Who else is involved</h2>
            <p>
              To run the booking, a few trusted service providers process your data
              on our behalf:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> &mdash; stores the booking securely in our
                database and runs the booking function.
              </li>
              <li>
                <strong>Google Calendar</strong> &mdash; creates the calendar event
                and Google Meet link for the call.
              </li>
              <li>
                <strong>Resend</strong> &mdash; sends your confirmation email from
                outgrowokay.com.
              </li>
              <li>
                <strong>DigitalOcean</strong> &mdash; hosts this website.
              </li>
            </ul>
            <p>
              Each handles your data only to provide its part of the service. We
              don&rsquo;t pass your details to anyone for their own purposes.
            </p>

            <h2>How long we keep it</h2>
            <p>
              We keep booking details only as long as we need them to arrange and
              follow up on your call, plus a reasonable period for ordinary business
              records. You can ask us to delete your details at any time and we
              will, unless we&rsquo;re required to keep them.
            </p>

            <h2>Your rights</h2>
            <p>
              You can ask to see the personal data we hold about you, ask us to
              correct or delete it, or object to how we use it. To do any of these,
              email <a href="mailto:hello@kashyyyk.co.uk">hello@kashyyyk.co.uk</a>.
              If you&rsquo;re not happy with how we&rsquo;ve handled your data, you
              can also complain to the UK Information Commissioner&rsquo;s Office
              (ICO).
            </p>

            <h2>Changes to this page</h2>
            <p>
              If we change how we handle data &mdash; for example, when we add
              analytics or a newsletter &mdash; we&rsquo;ll update this page and the
              date above before those changes go live.
            </p>
          </div>

          <div className="mt-12 border-t border-line pt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
            >
              <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
              Back to outgrowokay.com
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

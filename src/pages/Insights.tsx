import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Lockup } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { useGround } from "../components/useGround";

// Insights — placeholder. This is where the published long-form pieces will
// live once the Insight (blog) generation pipeline is ported over from the
// Kashyyyk Studio and rebranded. Dark ground, accent reserved.
export function Insights() {
  useGround("dark");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-5">
        <div className="mx-auto max-w-content flex items-center justify-between">
          <Link to="/" aria-label="Outgrow Okay — home">
            <Lockup ground="ink" className="h-7" />
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

      <main className="flex-1 px-5 py-16">
        <div className="mx-auto max-w-content">
          <p className="eyebrow">Insights</p>
          <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content max-w-[20ch]">
            Sharp, practical thinking on what actually moves a business.
          </h1>
          <p className="mt-5 max-w-prose text-md text-muted">
            We&rsquo;re building this out. Soon this is where you&rsquo;ll find
            our writing &mdash; the same lens we bring to client work, applied
            in the open. No filler, no recycled advice.
          </p>
          <p className="mt-8 num text-sm text-faint uppercase tracking-wide">
            Coming soon
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

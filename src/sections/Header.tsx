import { Link, NavLink } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Lockup } from "../components/Logo";

// Floating "pill" header: a rounded, translucent bar that detaches from the top edge,
// floats over the page (including hero imagery), and sticks on scroll. Ground-aware —
// the surface and logo variant follow the page ground (`.dark` on <html>), so one
// component serves both the dark marketing pages and the light long-reads. The ochre
// CTA is the single deliberate splash of accent; everything else stays quiet.
const NAV_LINK =
  "rounded-full px-3 py-2 text-sm text-muted transition-colors duration-fast hover:text-content";

export function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto max-w-content">
        <div
          className="flex items-center justify-between gap-3 rounded-full border border-line py-2 pl-4 pr-2 sm:pl-6"
          style={{
            background: "color-mix(in srgb, var(--oo-ground) 80%, transparent)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 10px 30px -12px rgba(11, 12, 10, 0.45)",
          }}
        >
          <Link to="/" aria-label="Outgrow Okay — home" className="min-w-0 shrink-0">
            {/* Ground-matched mark: bone-ground (ink marks) on light, ink-ground (bone marks) on dark. */}
            <Lockup ground="bone" className="block h-7 max-w-full dark:hidden" />
            <Lockup ground="ink" className="hidden h-7 max-w-full dark:block" />
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/insights" className={NAV_LINK}>
              Insights
            </NavLink>
            <Link to="/login" className={`${NAV_LINK} hidden items-center gap-2 sm:inline-flex`}>
              <LogIn size={15} strokeWidth={1.5} aria-hidden />
              Sign in
            </Link>
            <Link
              to="/book"
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-accent px-4 py-2 font-heading text-sm font-bold text-ink transition-[filter] duration-fast hover:brightness-105"
            >
              Book a call
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

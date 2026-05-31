import { type ComponentType } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { LogOut, type LucideProps } from "lucide-react";
import { Monogram } from "../components/Logo";
import { useGround } from "../components/useGround";
import { useAuth } from "../lib/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<LucideProps>;
  /** Render as a disabled "soon" row instead of a link. */
  soon?: boolean;
  /** Only match this exact path for the active state (e.g. the index route). */
  end?: boolean;
}

/**
 * The chrome shared by both authenticated areas (admin Studio + customer Portal).
 * Bone/light ground per the design system; accent is reserved for the active nav
 * item only. The nav set and area label are passed in by each layout.
 */
export function AppShell({
  areaLabel,
  nav,
}: {
  areaLabel: string;
  nav: NavItem[];
}) {
  useGround("light");
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-[240px] shrink-0 border-r border-line flex flex-col px-4 py-5">
        <Link
          to="/"
          aria-label="Outgrow Okay — home"
          className="flex items-center gap-3 px-2"
        >
          <Monogram ground="bone" className="h-7" />
          <span className="eyebrow">{areaLabel}</span>
        </Link>

        <nav className="mt-8 flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon, soon, end }) =>
            soon ? (
              <span
                key={label}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-faint cursor-default select-none"
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden />
                {label}
                <span className="num ml-auto text-[10px] uppercase tracking-wide">
                  Soon
                </span>
              </span>
            ) : (
              <NavLink
                key={label}
                to={to}
                end={end}
                className={({ isActive }) =>
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-fast " +
                  (isActive
                    ? "bg-surface text-content border-l-2 border-accent -ml-[2px] pl-[14px] font-semibold"
                    : "text-muted hover:text-content")
                }
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden />
                {label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="border-t border-line pt-4">
          <p className="px-3 text-sm text-content truncate">
            {profile?.full_name || profile?.email}
          </p>
          <p className="num px-3 text-[11px] uppercase tracking-wide text-faint">
            {profile?.role}
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted hover:text-content transition-colors duration-fast"
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-7 py-7 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

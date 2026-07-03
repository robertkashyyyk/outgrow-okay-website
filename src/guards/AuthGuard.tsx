import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homeFor, type Role } from "../lib/auth-context";

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <FullScreen>
      <div
        aria-label="Loading"
        className="h-6 w-6 rounded-full border-2 border-line border-t-accent motion-safe:animate-spin"
      />
    </FullScreen>
  );
}

/**
 * Gate for the authenticated areas. Requires a session; optionally requires a
 * specific role. Client-side routing only — the database RLS is the real gate.
 *
 * - no session            → /login (remembering where they were headed)
 * - session, no profile   → limbo screen (shouldn't happen; trigger provisions one)
 * - session, wrong role   → bounced to their own home (no loop: their home matches)
 */
export function AuthGuard({
  role,
  roles,
  children,
}: {
  role?: Role;
  /** Allow any of these roles (e.g. Studio = admin + partner). */
  roles?: Role[];
  children: ReactNode;
}) {
  const { session, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <FullScreen>
        <div className="max-w-prose text-center">
          <p className="eyebrow">Account</p>
          <h1 className="mt-4 font-heading font-bold text-lg text-content">
            Your account isn&rsquo;t set up yet.
          </h1>
          <p className="mt-3 text-base text-muted">
            You&rsquo;re signed in, but we couldn&rsquo;t find your profile. Get
            in touch and we&rsquo;ll sort it out.
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-6 text-sm text-muted hover:text-content transition-colors duration-fast underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </FullScreen>
    );
  }

  const allowed = roles ?? (role ? [role] : null);
  if (allowed && !allowed.includes(profile.role)) {
    return <Navigate to={homeFor(profile.role)} replace />;
  }

  return <>{children}</>;
}

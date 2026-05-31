import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type Role = "admin" | "customer";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

export interface AuthValue {
  /** undefined while the initial session check is in flight. */
  session: Session | null | undefined;
  /** The signed-in user's profile row (null if signed out / not provisioned). */
  profile: Profile | null;
  /** True until BOTH the session and (if present) the profile have resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** Where a given role belongs. */
export function homeFor(role: Role | undefined): string {
  return role === "admin" ? "/studio" : "/portal";
}

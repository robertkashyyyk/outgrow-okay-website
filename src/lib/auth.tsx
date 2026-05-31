import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { AuthContext, type AuthValue, type Profile } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // undefined = unresolved, null = resolved-but-none, Profile = resolved.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  // Track the auth session. setState only fires inside async/subscription
  // callbacks, never synchronously in the effect body.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  // Resolve the profile whenever the user identity changes.
  useEffect(() => {
    if (session === undefined) return; // initial session not resolved yet
    const uid = session?.user?.id ?? null;
    let active = true;
    (async () => {
      if (!uid) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", uid)
        .maybeSingle();
      if (active) setProfile((data as Profile | null) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthValue>(() => {
    const loading = session === undefined || profile === undefined;
    return {
      session,
      profile: profile ?? null,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error: error?.message ?? null };
      },
      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        return {
          error: error?.message ?? null,
          // With email confirmation on, signUp returns a user but no session.
          needsConfirmation: !error && !data.session,
        };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    };
  }, [session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

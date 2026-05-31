import { createClient } from "@supabase/supabase-js";

// Single browser client for the whole app. Anon key only — every privileged
// action is gated by RLS (see the profiles migration). Sessions persist and
// auto-refresh so a logged-in admin/customer stays signed in across reloads.
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the environment.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

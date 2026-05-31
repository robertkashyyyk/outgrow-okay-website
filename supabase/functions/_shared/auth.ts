// Shared authorisation for Studio-only edge functions. The gateway (verify_jwt = true)
// has already validated the JWT signature against this project's secret before we run,
// so here we only need to decide WHO the caller is:
//   - a signed-in admin (profiles.role = 'admin'), resolved from their JWT, or
//   - another trusted server presenting the service-role key (role claim service_role).
// Returns true only for those. Everything else (anon, signed-in customers) is rejected.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jwtRole(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

export async function isAuthorisedAdmin(req: Request): Promise<boolean> {
  const serviceKey =
    Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false

  // Service-to-service (batch jobs, scripts).
  if (token === serviceKey || jwtRole(token) === 'service_role') return true

  // Signed-in user → must be an admin.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data } = await admin.auth.getUser(token)
  const uid = data?.user?.id
  if (!uid) return false
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .maybeSingle()
  return profile?.role === 'admin'
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

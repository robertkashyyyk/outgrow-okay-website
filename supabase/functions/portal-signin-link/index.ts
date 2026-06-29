// Generate a one-time Portal sign-in link for a contact, WITHOUT sending any email.
// The admin copies it and delivers it however they like — the reliable fallback when
// automated (Resend) delivery is failing. Admin-only.
//
// For a brand-new email it mints an "invite" link (which creates the auth user); for
// an email that already has an account it mints a "recovery" link. Either way it
// returns the action_link + the user's id (so the caller can link the contact).
//
// Secrets: SUPABASE_URL (auto-injected), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// optional SITE_URL.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://outgrowokay.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jwtRole(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1]
    const j = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(j) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const serviceKey =
    Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Authorise: signed-in admin, or trusted server (service role) ──────────────
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  let authorised = false
  if (token && (token === serviceKey || jwtRole(token) === 'service_role')) {
    authorised = true
  } else if (token) {
    const { data: userData } = await admin.auth.getUser(token)
    const callerId = userData?.user?.id
    if (callerId) {
      const { data: callerProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', callerId)
        .maybeSingle()
      authorised = callerProfile?.role === 'admin'
    }
  }
  if (!authorised) return json({ error: 'Not authorised' }, 403)

  // ── Input ─────────────────────────────────────────────────────────────────────
  let payload: { email?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const email = payload.email?.trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'A valid email is required' }, 400)
  }

  // ── Mint a link (invite for new, recovery for existing) — no email sent ────────
  let link = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${SITE_URL}/welcome` },
  })
  let existing = false

  if (link.error || !link.data?.properties?.action_link) {
    const msg = link.error?.message ?? ''
    if (/already.*registered|already been registered|exists/i.test(msg)) {
      existing = true
      link = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${SITE_URL}/welcome` },
      })
    }
    if (link.error || !link.data?.properties?.action_link) {
      return json({ error: link.error?.message ?? 'Could not generate sign-in link' }, 502)
    }
  }

  return json({
    action_link: link.data.properties.action_link,
    user_id: link.data.user?.id ?? null,
    existing,
  })
})

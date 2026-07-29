import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Outgrow Okay account provisioning — admin-only. There is NO public self-registration.
// Accounts are created here (by an admin, or by the booking flow calling this function
// with the service role). We mint a Supabase "invite" action link via the admin API —
// which CREATES the auth user and returns a link, but sends NO email — then deliver a
// branded invite through Resend (verified outgrowokay.com domain). The invited person
// clicks the link, lands on /welcome already signed in, and sets their own password.
// No password ever travels in plaintext.
//
// Re-inviting an email that already has an account branches on state:
//  • never-activated (unconfirmed, never signed in) AND no dependent rows → delete the
//    shell and send a fresh INVITE (the path we know confirms + sets a password),
//    preserving whatever role it had (e.g. partner). No recovery-semantics guesswork.
//  • otherwise (confirmed, or has dependent data) → send a RECOVERY link.
//
// Secrets used: SUPABASE_URL (auto-injected), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, optional SITE_URL. Outgrow Okay is a trading name of Kashyyyk Ltd.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Brand tokens (inline hex required — email HTML can't use CSS custom properties).
// Mirrors src/index.css --oo-* values exactly.
const INK = '#16130f'
const BONE = '#f3ece0'
const ACCENT = '#b87d2a'
const GREY_200 = '#ddd5c8'
const GREY_500 = '#7a6e62'

const FOUNDER_NAME = 'Robert'
const FROM_INVITE = 'Outgrow Okay <hello@outgrowokay.com>'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://outgrowokay.com'

type Role = 'admin' | 'customer'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// NOTE: the stated link lifetime below must match the project's "Email OTP Expiration"
// (Dashboard → Auth → Providers → Email). That one dial governs every emailed link —
// invite, recovery, magic link, confirmation, email change — so keep this copy in sync
// with it. Currently set to 8 hours (a deliberate override of the auth_otp_long_expiry
// advisor, chosen so invited users aren't defeated by a short window).
function inviteHtml(firstName: string, actionLink: string): string {
  return `
    <div style="font-family: 'IBM Plex Sans', Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: ${BONE}; color: ${INK}; padding: 40px 36px; border-radius: 12px;">
      <p style="font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: ${ACCENT}; margin: 0 0 20px;">Your account is ready</p>
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 18px;">Hi ${firstName},</p>
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">We&rsquo;ve set up your Outgrow Okay account. Click below to choose a password and sign in — the link is just for you.</p>
      <a href="${actionLink}" style="display: inline-block; background: ${ACCENT}; color: ${INK}; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; margin-bottom: 24px;">Set your password</a>
      <p style="font-size: 14px; line-height: 1.65; color: ${GREY_500}; margin: 0 0 16px;">For your security this link expires after 8 hours. If it lapses, just let us know and we&rsquo;ll send a fresh one.</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 4px;">Speak soon,</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${FOUNDER_NAME}<br/>Outgrow Okay</p>
      <hr style="border: none; border-top: 1px solid ${GREY_200}; margin: 0 0 16px;" />
      <p style="font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 11px; color: ${GREY_500}; margin: 0;">Outgrow Okay — a trading name of Kashyyyk Ltd.</p>
    </div>
  `
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const serviceKey =
    Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Authorise the caller ────────────────────────────────────────────────────
  // Two accepted callers:
  //  1. A signed-in admin (Studio UI) — verified by resolving their JWT to a
  //     profile with role = 'admin'.
  //  2. Another trusted server (the booking function) presenting the service-role
  //     key as the bearer token — full machine-to-machine trust.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  // Decode a JWT payload without verifying — the gateway (verify_jwt = true) has
  // already validated the signature against this project's secret, so a forged token
  // never reaches here. We only read the role claim to distinguish a service-to-service
  // caller from a signed-in user.
  function jwtRole(jwt: string): string | null {
    try {
      const payload = jwt.split('.')[1]
      const j = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      return (JSON.parse(j) as { role?: string }).role ?? null
    } catch {
      return null
    }
  }

  let authorised = false
  if (token && (token === serviceKey || jwtRole(token) === 'service_role')) {
    authorised = true // service-to-service call (booking function, scripts)
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

  if (!authorised) {
    return json({ error: 'Not authorised' }, 403)
  }

  // ── Parse + validate input ──────────────────────────────────────────────────
  let payload: { email?: string; full_name?: string; role?: Role }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const email = payload.email?.trim().toLowerCase()
  const fullName = payload.full_name?.trim() || null
  const role: Role = payload.role === 'admin' ? 'admin' : 'customer'

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'A valid email is required' }, 400)
  }

  if (!serviceKey || !supabaseUrl) {
    console.error('Missing SUPABASE_URL or service-role key')
    return json({ error: 'Server misconfigured' }, 500)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const firstName = fullName ? fullName.split(' ')[0] : 'there'

  // Send a branded email carrying an action link. Returns whether it went out.
  async function sendActionEmail(actionLink: string, subject: string): Promise<boolean> {
    if (!resendKey) {
      console.error('RESEND_API_KEY not set — link minted but no email sent')
      return false
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_INVITE,
        to: [email],
        subject,
        html: inviteHtml(firstName, actionLink),
      }),
    })
    if (!r.ok) console.error('Resend email failed:', r.status, await r.text())
    return r.ok
  }

  // Apply a non-default role to a freshly created profile. The service-role client
  // satisfies the profiles_protect_role trigger (auth.role() = 'service_role'), so no
  // trigger-disabling is needed. 'customer' is the default handle_new_user already sets.
  async function applyRole(userId: string, wanted: string) {
    if (!userId || !wanted || wanted === 'customer') return
    const { error } = await admin.from('profiles').update({ role: wanted }).eq('id', userId)
    if (error) console.error('Role set failed:', JSON.stringify(error))
  }

  // Mint a brand-new invite (creates the auth user), set its role, and email it.
  async function freshInvite(wantedRole: string) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { full_name: fullName }, redirectTo: `${SITE_URL}/welcome` },
    })
    if (error || !data?.properties?.action_link) {
      console.error('generateLink invite failed:', error?.message)
      return json({ error: error?.message ?? 'Could not generate invite link' }, 502)
    }
    const userId = data.user?.id ?? null
    if (userId) await applyRole(userId, wantedRole)
    const emailSent = await sendActionEmail(data.properties.action_link, 'Your Outgrow Okay account')
    return json({ success: true, user_id: userId, role: wantedRole, email_sent: emailSent, existing: false })
  }

  // ── Does this email already have an account? ────────────────────────────────
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, role')
    .ilike('email', email)
    .maybeSingle()

  // Brand-new email → straight invite with the requested role.
  if (!existingProfile?.id) {
    return await freshInvite(role)
  }

  // Existing account — decide between a clean re-invite and a recovery link.
  const uid = existingProfile.id as string
  const { data: got } = await admin.auth.admin.getUserById(uid)
  const u = got?.user
  const neverActivated = !!u && !u.email_confirmed_at && !u.last_sign_in_at

  // Dependent rows a delete would damage — if any exist, never delete.
  const [contacts, reviews] = await Promise.all([
    admin.from('contacts').select('id', { count: 'exact', head: true }).eq('profile_id', uid),
    admin.from('site_reviews').select('id', { count: 'exact', head: true }).eq('created_by', uid),
  ])
  const hasDeps = (contacts.count ?? 0) > 0 || (reviews.count ?? 0) > 0

  if (neverActivated && !hasDeps) {
    // Safe, known-good path: delete the never-activated shell and send a fresh invite,
    // preserving whatever role it carried (e.g. partner). An invite link definitely
    // confirms and password-sets, so this sidesteps recovery-link semantics entirely.
    const preservedRole = (existingProfile.role as string) ?? role
    const { error: delErr } = await admin.auth.admin.deleteUser(uid)
    if (!delErr) return await freshInvite(preservedRole)
    console.error('deleteUser failed, falling back to recovery:', delErr.message)
  }

  // Confirmed, or has dependent data, or the delete failed → recovery link.
  const { data: rec } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE_URL}/welcome` },
  })
  const recLink = rec?.properties?.action_link
  const emailSent = recLink ? await sendActionEmail(recLink, 'Sign in to Outgrow Okay') : false
  return json({ success: true, user_id: uid, existing: true, email_sent: emailSent })
})

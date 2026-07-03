// Inbound Report Funnel — gate capture. PUBLIC (verify_jwt = false): a prospect submits
// name + email at /review. We create the report_leads row (service role, so the table
// stays admin-only in RLS), mint a return_token, capture any UTM params, and send a
// branded confirmation email with their personal return link. No read is drafted here.
//
// Secrets: SUPABASE_URL (auto), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, optional SITE_URL.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INK = '#16130f'
const BONE = '#f3ece0'
const ACCENT = '#b87d2a'
const GREY_200 = '#ddd5c8'
const GREY_500 = '#7a6e62'
const FOUNDER = 'Robert'
const FROM = 'Outgrow Okay <hello@outgrowokay.com>'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://outgrowokay.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const STEPS = [
  'Open whatever AI you already use — ChatGPT, Claude, Gemini, Copilot. Any of them work.',
  'Paste in Prompt 1 (the interview) and answer its questions, one at a time.',
  'When it says you’re done, paste in Prompt 2 (the report). It writes your review.',
  'Copy the finished report — the text itself, not a Google Doc link.',
  'Come back via your personal link and paste it in — I’ll send you an honest read on where to focus first.',
]

function confirmationHtml(firstName: string, returnUrl: string): string {
  const steps = STEPS.map(
    (s, i) =>
      `<tr><td style="padding:0 10px 10px 0;vertical-align:top;font-family:'IBM Plex Mono',monospace;color:${ACCENT};font-weight:700;">${i + 1}</td><td style="padding:0 0 10px;font-size:15px;line-height:1.55;">${s}</td></tr>`,
  ).join('')
  return `
    <div style="font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:${BONE};color:${INK};padding:40px 36px;border-radius:12px;">
      <p style="font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:${ACCENT};margin:0 0 20px;">Your operational review</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Hi ${firstName},</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 22px;">Thanks. Here’s the 20-minute exercise that maps where time and money leak in your business — you run it in your own AI and keep the report. Then send it back and I’ll give you an honest read on where I’d focus first.</p>
      <table style="border-collapse:collapse;margin:0 0 26px;">${steps}</table>
      <a href="${returnUrl}" style="display:inline-block;background:${ACCENT};color:${INK};padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:24px;">Open your report kit &rarr;</a>
      <p style="font-size:14px;line-height:1.65;color:${GREY_500};margin:0 0 16px;">That link is yours — it has your two prompts, and it’s where you paste the finished report when it’s ready. No rush; it’ll keep.</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 4px;">Speak soon,</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${FOUNDER}<br/>Outgrow Okay</p>
      <hr style="border:none;border-top:1px solid ${GREY_200};margin:0 0 16px;" />
      <p style="font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;color:${GREY_500};margin:0;">Outgrow Okay — a trading name of Kashyyyk Ltd.</p>
    </div>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    let payload: {
      name?: string
      email?: string
      utm_source?: string
      utm_medium?: string
      utm_campaign?: string
    }
    try {
      payload = await req.json()
    } catch {
      return json({ error: 'Invalid request' }, 400)
    }

    const name = (payload.name ?? '').trim()
    const email = (payload.email ?? '').trim().toLowerCase()
    if (!name) return json({ error: 'Please add your name.' }, 400)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Please add a valid email.' }, 400)
    }

    const serviceKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const returnToken = crypto.randomUUID().replace(/-/g, '')

    const { error: insErr } = await supabase.from('report_leads').insert({
      name,
      email,
      return_token: returnToken,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      status: 'captured',
    })
    if (insErr) return json({ error: 'Could not save that — please try again.' }, 500)

    const returnUrl = `${SITE_URL}/review/return?t=${returnToken}`

    // Confirmation email (best effort — the funnel still advances if this fails).
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const firstName = name.split(' ')[0]
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: 'Your operational review — start here',
          html: confirmationHtml(firstName, returnUrl),
        }),
      })
      if (!r.ok) console.error('Resend confirmation failed:', r.status, await r.text())
    } else {
      console.error('RESEND_API_KEY not set — lead saved, no email sent')
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

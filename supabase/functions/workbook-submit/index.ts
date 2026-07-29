// Bottleneck Workbook submission. PUBLIC (verify_jwt = false): a prospect fills the
// workbook on the site (or enters their paper findings) and requests a review. We store
// the submission (service role, so the table stays admin-only in RLS), email Robert the
// findings, and send the prospect a branded confirmation.
//
// Secrets: SUPABASE_URL (auto), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, optional SITE_URL, REVIEW_TO (defaults to hello@).

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
const FROM = 'Outgrow Okay <hello@outgrowokay.com>'
const FOUNDER = 'Robert'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://outgrowokay.com'
const REVIEW_TO = Deno.env.get('REVIEW_TO') ?? 'hello@outgrowokay.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
}

// Render the whole answer set for the internal notification. Keeps labels readable.
function answersTable(answers: Record<string, unknown>): string {
  const rows = Object.entries(answers)
    .filter(([, v]) => v != null && String(v).trim() !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => {
      const val = Array.isArray(v) ? v.map((x) => esc(x)).join('<br/>') : esc(v)
      return `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-family:'IBM Plex Mono',monospace;font-size:12px;color:${GREY_500};white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;line-height:1.5;">${val}</td></tr>`
    })
    .join('')
  return `<table style="border-collapse:collapse;width:100%;">${rows}</table>`
}

function internalHtml(name: string, email: string, mode: string, answers: Record<string, unknown>): string {
  return `
    <div style="font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:${INK};padding:8px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:${ACCENT};margin:0 0 8px;">Workbook · review requested</p>
      <p style="font-size:16px;margin:0 0 4px;"><strong>${esc(name)}</strong> &lt;${esc(email)}&gt;</p>
      <p style="font-size:13px;color:${GREY_500};margin:0 0 18px;">Filled ${mode === 'paper' ? 'on paper, entered findings online' : 'online'}.</p>
      ${answersTable(answers)}
    </div>`
}

function confirmationHtml(firstName: string): string {
  return `
    <div style="font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:${BONE};color:${INK};padding:40px 36px;border-radius:12px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:${ACCENT};margin:0 0 20px;">The Bottleneck Workbook</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Hi ${esc(firstName)},</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Got it — thanks for sending your workbook through. I'll read what you wrote and come back with an honest, specific read on your constraint and where I'd start. No pitch, no obligation.</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 22px;">If you'd rather just talk it through, you can grab a free 30 minutes here — it goes straight to a calendar, no payment:</p>
      <a href="https://calendar.app.google/nYF9YE9U84G44dNe8" style="display:inline-block;background:${ACCENT};color:${INK};padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:24px;">Book a 30-minute call &rarr;</a>
      <p style="font-size:15px;line-height:1.6;margin:0 0 4px;">Speak soon,</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${FOUNDER}<br/>Outgrow Okay</p>
      <hr style="border:none;border-top:1px solid ${GREY_200};margin:0 0 16px;" />
      <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${GREY_500};margin:0;">Outgrow Okay — a trading name of Kashyyyk Ltd. · ${SITE_URL}</p>
    </div>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let payload: {
    name?: string
    email?: string
    mode?: string
    answers?: Record<string, unknown>
    constraint_text?: string
    cost_per_month?: string
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
  const mode = payload.mode === 'paper' ? 'paper' : 'online'
  const answers = (payload.answers && typeof payload.answers === 'object') ? payload.answers : {}

  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: insErr } = await supabase.from('workbook_submissions').insert({
    name,
    email,
    mode,
    constraint_text: payload.constraint_text ?? null,
    cost_per_month: payload.cost_per_month ?? null,
    answers,
    status: 'submitted',
  })
  if (insErr) return json({ error: 'Could not save that — please try again.' }, 500)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    const firstName = name.split(/\s+/)[0] || name
    try {
      await sendEmail(resendKey, REVIEW_TO, `Workbook review — ${name}`, internalHtml(name, email, mode, answers))
      await sendEmail(resendKey, email, 'Your Bottleneck Workbook — I’ll be in touch', confirmationHtml(firstName))
    } catch {
      /* email is best-effort; the submission is already saved */
    }
  }

  return json({ ok: true })
})

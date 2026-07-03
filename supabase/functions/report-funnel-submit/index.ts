// Inbound Report Funnel — return submit. PUBLIC (verify_jwt = false): the prospect
// pastes their finished report on /review/return?t=TOKEN. We look the lead up by token,
// store the report (status -> submitted), and email Robert that one's waiting for his
// read. No auto-read, no scoring — those are separate/queued builds.
//
// Secrets: SUPABASE_URL (auto), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, optional NOTIFY_EMAIL (default robert@kashyyyk.co.uk), SITE_URL.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Outgrow Okay <hello@outgrowokay.com>'
const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') ?? 'robert@kashyyyk.co.uk'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://outgrowokay.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    let payload: { token?: string; report_text?: string }
    try {
      payload = await req.json()
    } catch {
      return json({ error: 'Invalid request' }, 400)
    }

    const token = (payload.token ?? '').trim()
    const reportText = (payload.report_text ?? '').trim()
    if (!token) return json({ error: 'Missing return token.' }, 400)
    if (reportText.length < 40) {
      return json({ error: 'That looks too short — paste the full report text.' }, 400)
    }

    const serviceKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Look the lead up by token; only accept a report before the read's been sent.
    const { data: lead, error: findErr } = await supabase
      .from('report_leads')
      .select('id, name, email, status')
      .eq('return_token', token)
      .maybeSingle()

    if (findErr) return json({ error: 'Something went wrong — please try again.' }, 500)
    if (!lead) return json({ error: 'That link isn’t valid. Check the link in your email.' }, 404)
    if (lead.status === 'read_sent') {
      return json({ error: 'This one’s already been read and sent back to you.' }, 409)
    }

    const { error: updErr } = await supabase
      .from('report_leads')
      .update({
        report_text: reportText,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('return_token', token)
    if (updErr) return json({ error: 'Could not save that — please try again.' }, 500)

    // Internal notification to Robert (best effort).
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [NOTIFY_EMAIL],
          subject: `Report in — ${lead.name} needs a read`,
          html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#16130f;">
            <p><b>${esc(lead.name)}</b> (${esc(lead.email)}) has submitted their operational review.</p>
            <p>Read it and draft the read in the Studio:</p>
            <p><a href="${SITE_URL}/studio/report-funnel">${SITE_URL}/studio/report-funnel</a></p>
          </div>`,
        }),
      })
      if (!r.ok) console.error('Resend notify failed:', r.status, await r.text())
    } else {
      console.error('RESEND_API_KEY not set — report saved, no notification sent')
    }

    return json({ ok: true, name: lead.name })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

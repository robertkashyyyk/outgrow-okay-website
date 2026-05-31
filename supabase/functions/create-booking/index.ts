import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Outgrow Okay booking function — lives in the OO Supabase project (ref
// isldzythfgmxvyfgveji), fully separate from Kashyyyk. Reads project-level secrets:
// GOOGLE_CALENDAR_* (robert@kashyyyk.co.uk's personal calendar via OAuth refresh
// token), RESEND_API_KEY (sends from the verified outgrowokay.com domain) and
// SERVICE_ROLE_KEY. Outgrow Okay is a trading name of Kashyyyk Ltd.

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
const FROM_CLIENT = 'Outgrow Okay <bookings@outgrowokay.com>'
const FROM_INTERNAL = 'Outgrow Okay Bookings <bookings@outgrowokay.com>'
const INTERNAL_TO = 'hello@kashyyyk.co.uk'

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') ?? '',
      refresh_token: Deno.env.get('GOOGLE_CALENDAR_REFRESH_TOKEN') ?? '',
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

function formatDateParts(iso: string): { full: string; tz: string } {
  const d = new Date(iso)
  const full = d.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
  // Whether London is currently on BST or GMT
  const tz = d.toLocaleString('en-GB', { timeZoneName: 'short', timeZone: 'Europe/London' }).split(' ').pop() ?? 'UK time'
  return { full, tz }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, business_name, challenge, scheduled_at } = await req.json()

    if (!name || !email || !scheduled_at) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarId  = Deno.env.get('GOOGLE_CALENDAR_ID') ?? 'primary'
    const accessToken = await getAccessToken()
    const resendKey   = Deno.env.get('RESEND_API_KEY')

    // End time = start + 60 minutes
    const startDate = new Date(scheduled_at)
    const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000)

    const description = [
      'Discovery Call Booking',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      business_name ? `Business: ${business_name}` : null,
      '',
      challenge ? `Main Challenge:\n${challenge}` : null,
      '',
      'Booked via outgrowokay.com',
    ].filter(l => l !== null).join('\n')

    // Create Google Calendar event with Meet conferencing.
    // attendees + sendUpdates:'all' => Google issues the calendar invitation email.
    const eventPayload = {
      summary:     `Discovery Call — ${name}${business_name ? ` (${business_name})` : ''}`,
      description,
      start:       { dateTime: startDate.toISOString(), timeZone: 'Europe/London' },
      end:         { dateTime: endDate.toISOString(),   timeZone: 'Europe/London' },
      attendees:   [{ email }],
      conferenceData: {
        createRequest: {
          requestId:             `outgrow-okay-booking-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    }

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(eventPayload),
      }
    )
    const calEvent = await calRes.json()

    const meetLink = calEvent.hangoutLink
      ?? calEvent.conferenceData?.entryPoints?.find((e: { entryPointType: string; uri: string }) => e.entryPointType === 'video')?.uri
      ?? null

    const googleEventId = calEvent.id ?? null

    // Save to the OO project's bookings table. SUPABASE_URL is auto-injected by the
    // edge runtime, so this always targets whichever project the function is deployed
    // to — never hardcode a project ref here.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase.from('bookings').insert({
      name,
      email,
      business_name: business_name ?? null,
      challenge:     challenge ?? null,
      scheduled_at:  startDate.toISOString(),
      google_event_id: googleEventId,
      meet_link:     meetLink,
      status:        'confirmed',
    })

    // Branded OO confirmation email — light (bone) ground, ink text, mono date line,
    // Meet link as the single clear action. Short by design.
    if (resendKey && meetLink) {
      const { full: formattedTime, tz } = formatDateParts(scheduled_at)
      const firstName = name.split(' ')[0]

      const clientHtml = `
        <div style="font-family: 'IBM Plex Sans', Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: ${BONE}; color: ${INK}; padding: 40px 36px; border-radius: 12px;">
          <p style="font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: ${ACCENT}; margin: 0 0 20px;">Discovery call confirmed</p>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 18px;">Hi ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">You&rsquo;re booked in. Here are the details:</p>
          <div style="border-top: 1px solid ${GREY_200}; border-bottom: 1px solid ${GREY_200}; padding: 20px 0; margin-bottom: 24px;">
            <p style="font-size: 15px; font-weight: 600; margin: 0 0 6px;">Discovery call</p>
            <p style="font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 15px; font-variant-numeric: tabular-nums; margin: 0; color: ${INK};">${formattedTime} (${tz})</p>
          </div>
          <a href="${meetLink}" style="display: inline-block; background: ${ACCENT}; color: ${INK}; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; margin-bottom: 24px;">Join here</a>
          <p style="font-size: 14px; line-height: 1.65; color: ${GREY_500}; margin: 0 0 16px;">The link works at the time of the call — no need to do anything before then.</p>
          <p style="font-size: 14px; line-height: 1.65; color: ${GREY_500}; margin: 0 0 16px;">Just make sure your microphone and speaker are working (camera is a bonus) — we&rsquo;d always recommend a computer rather than a phone.</p>
          <p style="font-size: 14px; line-height: 1.65; color: ${GREY_500}; margin: 0 0 24px;">It&rsquo;s a straight conversation about where your business actually is. If we&rsquo;re not a fit, we&rsquo;ll say so.</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 4px;">See you then,</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${FOUNDER_NAME}<br/>Outgrow Okay</p>
          <p style="font-size: 13px; line-height: 1.6; color: ${GREY_500}; margin: 0 0 24px;">Need to rearrange? Wait for the invitation from our calendar and you can do it from there.</p>
          <hr style="border: none; border-top: 1px solid ${GREY_200}; margin: 0 0 16px;" />
          <p style="font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 11px; color: ${GREY_500}; margin: 0;">Outgrow Okay — a trading name of Kashyyyk Ltd.</p>
        </div>
      `

      const internalHtml = `
        <div style="font-family: 'IBM Plex Sans', Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: ${BONE}; color: ${INK}; padding: 28px;">
          <p style="font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 12px; font-weight: 600; color: ${ACCENT}; margin: 0 0 16px;">New Outgrow Okay booking</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: ${GREY_500}; width: 120px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${name}</td></tr>
            <tr><td style="padding: 6px 0; color: ${GREY_500};">Email</td><td style="padding: 6px 0;">${email}</td></tr>
            ${business_name ? `<tr><td style="padding: 6px 0; color: ${GREY_500};">Business</td><td style="padding: 6px 0;">${business_name}</td></tr>` : ''}
            <tr><td style="padding: 6px 0; color: ${GREY_500};">Time</td><td style="padding: 6px 0; font-weight: 600;">${formattedTime} (${tz})</td></tr>
          </table>
          ${challenge ? `<div style="border-top: 1px solid ${GREY_200}; margin-top: 16px; padding-top: 16px;"><p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${GREY_500}; margin: 0 0 8px;">Main challenge</p><p style="font-size: 14px; line-height: 1.6; margin: 0;">${challenge}</p></div>` : ''}
          <a href="${meetLink}" style="display: inline-block; background: ${ACCENT}; color: ${INK}; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; margin-top: 20px;">Open Google Meet</a>
        </div>
      `

      await Promise.all([
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    FROM_CLIENT,
            to:      [email],
            subject: `Your discovery call is confirmed — ${formattedTime}`,
            html:    clientHtml,
          }),
        }),
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    FROM_INTERNAL,
            to:      [INTERNAL_TO],
            subject: `New booking: ${name} — ${formattedTime}`,
            html:    internalHtml,
          }),
        }),
      ])
    }

    return new Response(JSON.stringify({ success: true, meet_link: meetLink, event_id: googleEventId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

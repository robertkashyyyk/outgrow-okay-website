import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { timeMin, timeMax } = await req.json().catch(() => ({}))
    const calendarId  = Deno.env.get('GOOGLE_CALENDAR_ID') ?? 'primary'
    const accessToken = await getAccessToken()

    const now   = new Date()
    const start = timeMin ?? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const end   = timeMax ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime&maxResults=50`

    const eventsRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const eventsData = await eventsRes.json()

    return new Response(JSON.stringify(eventsData.items ?? []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

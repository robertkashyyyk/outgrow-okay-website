// Website Review — admin/partner runs a digital-presence review from a prospect's
// email address (or website). Derives the domain, reads the site (Firecrawl if a key
// is set, else a plain fetch), and has Claude write an honest review. The input email
// is kept as the captured contact. Warm/manual — no cold outreach, no auto-send.
//
// Secrets: SUPABASE_URL (auto), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// ANTHROPIC_API_KEY, optional FIRECRAWL_API_KEY (better scrape when present).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const GENERIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk',
  'live.com', 'live.co.uk', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'icloud.com', 'me.com', 'aol.com', 'gmx.com', 'proton.me', 'protonmail.com',
])

function normaliseUrl(raw: string): string {
  let u = raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  return `https://${u}`
}

async function firecrawl(url: string, key: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    })
    const data = await res.json()
    return data?.data?.markdown ?? ''
  } catch {
    return ''
  }
}

async function plainFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 OutgrowOkayBot' } })
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000)
  } catch {
    return ''
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const serviceKey =
    Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── Authorise: admin or partner (both may run reviews) ────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Not authorised' }, 401)
  const { data: userData } = await admin.auth.getUser(token)
  const callerId = userData?.user?.id
  if (!callerId) return json({ error: 'Not authorised' }, 403)
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', callerId).maybeSingle()
  if (profile?.role !== 'admin' && profile?.role !== 'partner') {
    return json({ error: 'Not authorised' }, 403)
  }

  try {
    const { email, website } = (await req.json()) as { email?: string; website?: string }

    // Work out what site to review.
    let inputEmail: string | null = email?.trim().toLowerCase() || null
    let domain = ''
    if (website && website.trim()) {
      domain = website.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
    } else if (inputEmail && inputEmail.includes('@')) {
      domain = inputEmail.split('@')[1]
      if (GENERIC_DOMAINS.has(domain)) {
        return json(
          { error: `${domain} is a personal email — add their website address instead.` },
          400,
        )
      }
    }
    if (!domain) return json({ error: 'Add an email address or a website.' }, 400)

    const websiteUrl = normaliseUrl(domain)

    // ── Read the site: Firecrawl if configured, else a plain fetch ─────────────
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    const base = websiteUrl.replace(/\/$/, '')
    const pages = [base, `${base}/about`, `${base}/services`, `${base}/contact`]
    let content = ''
    if (firecrawlKey) {
      const scraped = await Promise.all(pages.map((u) => firecrawl(u, firecrawlKey)))
      content = scraped.filter(Boolean).join('\n\n---\n\n')
    } else {
      content = await plainFetch(base)
    }
    if (content.trim().length < 60) {
      return json({ error: 'Couldn’t read enough of that site to review it.' }, 422)
    }

    // ── Generate the review ────────────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

    const prompt = `You are a senior digital strategist writing an honest, genuinely useful digital-presence review of a real business, from their actual scraped website content below. This is a warm review — the reader already knows us — so be helpful and specific, not salesy or generic.

Website: ${websiteUrl}

SCRAPED CONTENT:
${content.slice(0, 9000)}

RULES:
- Only state things you can VERIFY from the content. Never invent facts, stats, or claims.
- Be specific — name the actual pages, copy, or missing elements you observed.
- Honest and constructive. Real strengths, real gaps.

Return ONLY this JSON (no markdown fences):
{
  "business_name": "<the business name from the site, else the domain>",
  "digital_score": <0-100, honest>,
  "score_label": "<Developing|Growing|Established|Advanced>",
  "summary": "<2-3 sentences: an honest read of their digital presence>",
  "strengths": [{"title":"<specific>","description":"<2-3 sentences, evidence-based>"}],
  "opportunities": [{"title":"<specific, named issue>","description":"<2-3 sentences: the actual gap and why it matters>"}],
  "quick_wins": [{"title":"<quick win>","description":"<what to do and why>","effort":"<e.g. 30 minutes>"}],
  "competitor_note": "<1-2 sentences on what strong competitors in their space tend to do better online>"
}
Produce: 2-3 strengths, 3-4 opportunities, 3 quick_wins. Score honestly and strictly.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: 'Review generation failed', details: data }, 502)
    const text: string = data.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return json({ error: 'Could not parse the review.' }, 502)
    const report = JSON.parse(match[0])

    // ── Save + return ──────────────────────────────────────────────────────────
    const { data: saved, error: insErr } = await admin
      .from('site_reviews')
      .insert({
        created_by: callerId,
        input_email: inputEmail,
        domain,
        website_url: websiteUrl,
        business_name: report.business_name ?? domain,
        digital_score: report.digital_score ?? null,
        score_label: report.score_label ?? null,
        report,
        status: 'done',
      })
      .select()
      .single()
    if (insErr) return json({ error: insErr.message }, 500)

    return json({ ok: true, review: saved })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

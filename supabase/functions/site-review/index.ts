// Website Review v2 — a proper digital-presence audit from a prospect's email/website.
// Gathers measured signals (Firecrawl content + screenshot + raw HTML, Google Lighthouse
// via PageSpeed, page count/freshness, on-page SEO, tech stack, media) then Claude writes
// a scored review with sub-scores + operational read. Warm/manual — nothing auto-sent.
//
// Secrets: SUPABASE_URL (auto), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// ANTHROPIC_API_KEY, FIRECRAWL_API_KEY, optional GOOGLE_PAGESPEED_API_KEY.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
const GENERIC_DOMAINS = new Set(['gmail.com','googlemail.com','outlook.com','hotmail.com','hotmail.co.uk','live.com','live.co.uk','msn.com','yahoo.com','yahoo.co.uk','ymail.com','icloud.com','me.com','aol.com','gmx.com','proton.me','protonmail.com'])
function normaliseUrl(raw: string): string {
  return `https://${raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`
}

// ── Signal gatherers (each best-effort, never throws) ─────────────────────────
async function firecrawlScrape(url: string, key: string) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown', 'rawHtml', 'screenshot'], onlyMainContent: false }),
    })
    const d = await res.json()
    return { markdown: d?.data?.markdown ?? '', rawHtml: d?.data?.rawHtml ?? '', screenshot: d?.data?.screenshot ?? '' }
  } catch { return { markdown: '', rawHtml: '', screenshot: '' } }
}
async function firecrawlMd(url: string, key: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    })
    return (await res.json())?.data?.markdown ?? ''
  } catch { return '' }
}
async function firecrawlMap(url: string, key: string): Promise<number | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const d = await res.json()
    return Array.isArray(d?.links) ? d.links.length : null
  } catch { return null }
}
async function lighthouse(url: string, key?: string) {
  try {
    const cats = ['performance', 'seo', 'accessibility', 'best-practices'].map((c) => `category=${c}`).join('&')
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&${cats}${key ? `&key=${key}` : ''}`
    const d = await (await fetch(api)).json()
    const c = d?.lighthouseResult?.categories
    if (!c) return null
    const pct = (x: { score?: number } | undefined) => (x?.score != null ? Math.round(x.score * 100) : null)
    return { performance: pct(c.performance), seo: pct(c.seo), accessibility: pct(c.accessibility), best_practices: pct(c['best-practices']) }
  } catch { return null }
}
async function sitemapAndRobots(base: string) {
  const out = { has_sitemap: false, page_count: null as number | null, last_updated: null as string | null, has_robots: false }
  try {
    const sm = await fetch(`${base}/sitemap.xml`)
    if (sm.ok) {
      const xml = await sm.text()
      out.has_sitemap = /<urlset|<sitemapindex/i.test(xml)
      out.page_count = (xml.match(/<loc>/gi) || []).length || null
      const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)].map((m) => m[1].trim())
      out.last_updated = dates.sort().pop() ?? null
    }
  } catch { /* ignore */ }
  try { out.has_robots = (await fetch(`${base}/robots.txt`)).ok } catch { /* ignore */ }
  return out
}
function detectTech(html: string, server: string, poweredBy: string) {
  const h = html.toLowerCase()
  const gen = (html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i) || [])[1] || ''
  let platform = 'Custom / unknown'
  let detail = ''
  if (/wp-content|wp-includes|wp-json/.test(h) || /wordpress/i.test(gen)) {
    platform = 'WordPress'
    const v = (gen.match(/wordpress\s*([\d.]+)/i) || [])[1]
    if (v) detail = `v${v}`
  } else if (/wixstatic|_wixcssframework|wix\.com/.test(h) || /wix/i.test(gen)) platform = 'Wix'
  else if (/squarespace/.test(h)) platform = 'Squarespace'
  else if (/cdn\.shopify|myshopify/.test(h)) platform = 'Shopify'
  else if (/webflow/.test(h)) platform = 'Webflow'
  else if (/hs-scripts|hubspot/.test(h)) platform = 'HubSpot'
  else if (/framerusercontent|framer\.com/.test(h)) platform = 'Framer'
  else if (/godaddy|websitebuilder/.test(h)) platform = 'GoDaddy'
  else if (gen) platform = gen
  return { platform, detail, generator: gen, server, powered_by: poweredBy }
}
function seoChecks(html: string) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || ''
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || ''
  return {
    has_title: !!title, title_len: title.length,
    meta_description: !!desc, desc_len: desc.length,
    h1_count: (html.match(/<h1[\s>]/gi) || []).length,
    open_graph: /<meta[^>]+property=["']og:/i.test(html),
    twitter_card: /<meta[^>]+name=["']twitter:/i.test(html),
    canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    mobile_viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    structured_data: /application\/ld\+json/i.test(html),
    favicon: /rel=["'](shortcut )?icon["']/i.test(html),
    images: (html.match(/<img[\s>]/gi) || []).length,
    images_missing_alt: (html.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length,
  }
}
function mediaChecks(html: string) {
  return {
    native_video: (html.match(/<video[\s>]/gi) || []).length,
    youtube_embeds: (html.match(/youtube\.com\/embed|youtu\.be|youtube-nocookie/gi) || []).length,
    vimeo_embeds: (html.match(/player\.vimeo\.com/gi) || []).length,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Not authorised' }, 401)
  const { data: userData } = await admin.auth.getUser(token)
  const callerId = userData?.user?.id
  if (!callerId) return json({ error: 'Not authorised' }, 403)
  const { data: prof } = await admin.from('profiles').select('role').eq('id', callerId).maybeSingle()
  if (prof?.role !== 'admin' && prof?.role !== 'partner') return json({ error: 'Not authorised' }, 403)

  try {
    const { email, website } = (await req.json()) as { email?: string; website?: string }
    const inputEmail = email?.trim().toLowerCase() || null
    let domain = ''
    if (website && website.trim()) domain = website.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
    else if (inputEmail && inputEmail.includes('@')) {
      domain = inputEmail.split('@')[1]
      if (GENERIC_DOMAINS.has(domain)) return json({ error: `${domain} is a personal email — add their website instead.` }, 400)
    }
    if (!domain) return json({ error: 'Add an email address or a website.' }, 400)
    const websiteUrl = normaliseUrl(domain)
    const base = websiteUrl

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    const psKey = Deno.env.get('GOOGLE_PAGESPEED_API_KEY')
    if (!firecrawlKey) return json({ error: 'FIRECRAWL_API_KEY not set' }, 500)

    // Gather everything in parallel.
    const [home, aboutMd, servicesMd, contactMd, pageCount, lh, smr, headRes] = await Promise.all([
      firecrawlScrape(base, firecrawlKey),
      firecrawlMd(`${base}/about`, firecrawlKey),
      firecrawlMd(`${base}/services`, firecrawlKey),
      firecrawlMd(`${base}/contact`, firecrawlKey),
      firecrawlMap(base, firecrawlKey),
      lighthouse(base, psKey),
      sitemapAndRobots(base),
      fetch(base, { headers: { 'User-Agent': 'Mozilla/5.0 OutgrowOkayBot' } }).catch(() => null),
    ])

    const content = [home.markdown, aboutMd, servicesMd, contactMd].filter(Boolean).join('\n\n---\n\n')
    if (content.trim().length < 60) return json({ error: 'Couldn’t read enough of that site to review it.' }, 422)

    const rawHtml = home.rawHtml || ''
    const server = headRes?.headers.get('server') ?? ''
    const poweredBy = headRes?.headers.get('x-powered-by') ?? ''
    const signals = {
      tech: detectTech(rawHtml, server, poweredBy),
      lighthouse: lh,
      crawl: { page_count: smr.page_count ?? pageCount, has_sitemap: smr.has_sitemap, last_updated: smr.last_updated, has_robots: smr.has_robots },
      seo: seoChecks(rawHtml),
      media: mediaChecks(rawHtml),
    }

    // Persist the screenshot to storage (public) so the report can embed it.
    let screenshotUrl: string | null = null
    if (home.screenshot) {
      try {
        const imgRes = await fetch(home.screenshot)
        if (imgRes.ok) {
          const bytes = new Uint8Array(await imgRes.arrayBuffer())
          const path = `${domain.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`
          const { error: upErr } = await admin.storage.from('site-reviews').upload(path, bytes, { contentType: 'image/png', upsert: true })
          if (!upErr) screenshotUrl = admin.storage.from('site-reviews').getPublicUrl(path).data.publicUrl
        }
      } catch { /* screenshot optional */ }
    }

    // ── Narrative via Claude, informed by the measured signals ─────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

    const prompt = `You are a senior digital strategist writing an honest, genuinely useful digital-presence audit of a real business. Below is their scraped website content AND a set of MEASURED technical signals. Use both. Be specific and constructive — this is a warm review the reader already asked for, not a cold pitch.

Website: ${websiteUrl}

MEASURED SIGNALS (facts — weave these in, don't contradict them):
${JSON.stringify(signals, null, 2)}

SCRAPED CONTENT:
${content.slice(0, 9000)}

RULES:
- Ground every claim in the content or the measured signals. Never invent facts.
- Reference concrete things: the tech stack, the Lighthouse scores, page count/freshness, missing SEO tags, lack of video, etc.
- The "operational_signals" field is your read of what the digital presence IMPLIES about how the business runs operationally (e.g. no enquiry form/booking → manual intake; thin content → little marketing capacity). Clearly framed as inference.

Return ONLY this JSON (no fences):
{
  "business_name": "<name from the site, else the domain>",
  "digital_score": <0-100 overall, honest and strict>,
  "score_label": "<Developing|Growing|Established|Advanced>",
  "summary": "<3-4 sentences: an honest overall read>",
  "scorecard": { "content": <0-10>, "design": <0-10>, "seo": <0-10>, "tech": <0-10>, "findability": <0-10>, "conversion": <0-10> },
  "strengths": [{"title":"<specific>","description":"<2-3 sentences, evidence-based>"}],
  "opportunities": [{"title":"<specific, named>","description":"<2-3 sentences: the gap and why it matters>"}],
  "quick_wins": [{"title":"<quick win>","description":"<what to do and why>","effort":"<e.g. 30 minutes>"}],
  "operational_signals": "<2-4 sentences inferring how they likely run operationally, from the digital signals>",
  "competitor_note": "<1-2 sentences on what strong competitors in their space do better online>"
}
Produce: 3 strengths, 4 opportunities, 3 quick_wins. Score the scorecard honestly against the measured signals.`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    })
    const aiData = await aiRes.json()
    if (!aiRes.ok) return json({ error: 'Review generation failed', details: aiData }, 502)
    const textOut: string = aiData.content?.[0]?.text ?? ''
    const m = textOut.match(/\{[\s\S]*\}/)
    if (!m) return json({ error: 'Could not parse the review.' }, 502)
    const report = JSON.parse(m[0])

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
        signals,
        screenshot_url: screenshotUrl,
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

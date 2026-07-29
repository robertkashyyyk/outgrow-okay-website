// Weekly auto-insight. Runs from pg_cron (via pg_net) on Sundays; writes ONE post
// in the house style, distinct from what's already published, ending in a soft
// invitation, with a "Book a 30-minute call" CTA — then auto-publishes it live.
//
// Cron fires at 11:00 AND 12:00 UTC on Sundays; a UK-noon guard means exactly one
// of those proceeds (12:00 UK in both BST and GMT). A weekly idempotency guard stops
// a retry from double-posting.
//
// Auth (verify_jwt is off for this function): a call is allowed if it carries the
// shared cron secret (x-cron-key, used by pg_cron) OR a signed-in admin / service
// JWT (for manual runs). Body flags: { force } skips the time/idempotency guards;
// { dryRun } generates and returns the post WITHOUT saving or publishing it.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, isAuthorisedAdmin } from '../_shared/auth.ts'

type Supa = ReturnType<typeof createClient>

const VOICE =
  'Outgrow Okay helps founders and small teams stop being the bottleneck — by building ' +
  'the systems, automation and AI that let a business run without them in every loop. ' +
  'The voice is plain-talking and direct: short sentences, concrete examples, no corporate ' +
  'jargon, no hype, honest about trade-offs. Like a sharp operator talking to another operator.'

const IMAGE_AESTHETIC =
  'warm neutral palette — bone/off-white paper and deep near-black ink, with a single ' +
  'restrained ochre/burnt-amber accent used sparingly. Calm, editorial, minimal, lots of ' +
  'negative space. No text, no logos, no busy detail.'

// The booking CTA. Overridable via env so the link can change without a redeploy.
const CTA_URL = Deno.env.get('BOOKING_URL') ?? 'https://calendar.app.google/nYF9YE9U84G44dNe8'
const CTA_LABEL = Deno.env.get('BOOKING_CTA_LABEL') ?? 'Book a 30-minute call'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Current hour (0–23) in UK local time, honouring BST/GMT.
function ukHour(): number {
  const s = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false })
  return parseInt(s, 10)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Machine (cron) or human (admin) — either may run this function.
async function authorised(req: Request, supabase: Supa): Promise<boolean> {
  const key = req.headers.get('x-cron-key')
  if (key) {
    const { data } = await supabase
      .from('cron_secrets')
      .select('secret')
      .eq('name', 'weekly_insight')
      .maybeSingle()
    const secret = (data as { secret: string } | null)?.secret
    if (secret && key === secret) return true
  }
  return await isAuthorisedAdmin(req)
}

// Sample of the existing library: enough for the model to learn the house style and
// avoid repeating a topic or an opening. Newest first.
async function readCorpus(supabase: Supa): Promise<{ title: string; excerpt: string; opening: string }[]> {
  const { data } = await supabase
    .from('blog_posts')
    .select('title, excerpt, content, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(25)
  return (data ?? []).map((p) => {
    const row = p as { title: string; excerpt: string | null; content: string }
    const opening = (row.content ?? '').replace(/^#.*$/m, '').trim().slice(0, 180)
    return { title: row.title, excerpt: row.excerpt ?? '', opening }
  })
}

async function generatePost(
  corpus: { title: string; excerpt: string; opening: string }[],
  anthropicKey: string,
): Promise<{ title: string; slug: string; excerpt: string; content: string; tags: string[] } | null> {
  const titles = corpus.map((c) => `- ${c.title}`).join('\n')
  const openings = corpus.slice(0, 12).map((c) => `- "${c.opening}"`).join('\n')

  // Retry the model call — a single transient error (rate limit, blip) must not
  // cause the whole week to silently miss a post.
  for (let attempt = 1; attempt <= 3; attempt++) {
   try {
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
      messages: [{
        role: 'user',
        content: `You are writing this week's post for Outgrow Okay's Insights blog. ${VOICE}

Here are the titles already published — do NOT repeat any of these topics or anything closely adjacent:
${titles}

Here are some existing opening lines — your first sentence and first image must be clearly different from all of them (different scenario, different object, different framing):
${openings}

Write ONE new post that sits naturally alongside these — same voice, same shape, same kind of concrete operator-to-operator advice — on a FRESH topic in the Outgrow Okay wheelhouse (getting out of the day-to-day, systems, SOPs, automation, practical AI, margins, the one constraint, delegation, bottlenecks). Pick a genuinely new angle the library doesn't already cover.

The post should be:
- 600-900 words of substantive, practical content
- Written for founders and operators, not engineers
- Specific and actionable — not generic advice
- Include a real scenario or example

CRITICAL WRITING RULES — apply to every sentence, not just the opening:

BANNED OPENERS — never start the post or any paragraph with:
- "Many businesses" / "Most businesses" / "Every business" (or owner/founder variants)
- "Every day" / "Every week" / "Every [anything]" as a paragraph opener
- Any generic plural opener that could apply to anyone anywhere

The very first sentence MUST be one of: a specific scenario the reader recognises, a direct statement or bold claim, a question that challenges an assumption, a specific number, or a short punchy observation.

ENDING — the final short paragraph must gently turn toward a conversation, in the OO voice, without hype and without a hard sell. Something in the spirit of: "If any of this sounds like a conversation worth having, that's the kind of thing we help with." Do NOT add a link, a button, or a call-to-action heading — a booking button is attached separately.

Return ONLY a valid JSON object with exactly these fields:
{
  "title": "Post title",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence summary for listings (also used as the meta description)",
  "content": "Full markdown content of the post",
  "tags": ["tag1", "tag2", "tag3"]
}

No markdown fences, no explanation — just the raw JSON object.`,
      }],
    }),
    })
      if (res.ok) {
        const data = await res.json()
        const text = data.content?.[0]?.text ?? ''
        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
          try {
            return JSON.parse(match[0])
          } catch {
            /* bad JSON — fall through to retry */
          }
        }
      }
   } catch {
      /* network error — fall through to retry */
   }
   if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000))
  }
  return null
}

async function generateImage(
  title: string,
  excerpt: string,
  anthropicKey: string,
  openaiKey: string,
  supabase: Supa,
): Promise<string | null> {
  let imagePrompt = `Editorial cover image for an article titled "${title}". ${IMAGE_AESTHETIC}`
  try {
    const pRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Write a single image prompt for a blog cover. Title: "${title}". Excerpt: "${excerpt}". Aesthetic: ${IMAGE_AESTHETIC} Evocative and premium, suggestive not literal. Return only the prompt.`,
        }],
      }),
    })
    const pData = await pRes.json()
    if (pRes.ok && pData.content?.[0]?.text) imagePrompt = pData.content[0].text.trim()
  } catch {
    /* use fallback prompt */
  }

  try {
    const iRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: imagePrompt, n: 1, size: '1536x1024', quality: 'medium' }),
    })
    const iData = await iRes.json()
    const b64 = iData.data?.[0]?.b64_json
    if (!b64) return null
    const binary = atob(b64)
    const imgBytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i)
    const fileName = `covers/weekly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    const { error } = await supabase.storage.from('blog-images').upload(fileName, imgBytes, { contentType: 'image/png', upsert: false })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(fileName)
    return publicUrl
  } catch {
    return null
  }
}

// A slug that isn't already taken (append -2, -3, … on collision).
async function uniqueSlug(supabase: Supa, base: string): Promise<string> {
  const root = base || `insight-${Date.now()}`
  for (let n = 1; n < 20; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    const { data } = await supabase.from('blog_posts').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}-${Date.now()}`
}

// Has this week's auto-post already gone out? Guards against the 11:00/12:00 double
// fire and any pg_net retry. True if a weekly_auto job completed in the last 3 days.
async function alreadyPostedThisWeek(supabase: Supa): Promise<boolean> {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('generation_jobs')
    .select('id')
    .eq('type', 'weekly_auto')
    .eq('status', 'complete')
    .gte('created_at', since)
    .limit(1)
  return (data?.length ?? 0) > 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? null
  if (!serviceKey) return json({ error: 'service role key not set' }, 500)
  if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (!(await authorised(req, supabase))) return json({ error: 'Not authorised' }, 403)

  let force = false
  let dryRun = false
  try {
    const body = await req.json()
    force = body?.force === true
    dryRun = body?.dryRun === true
  } catch {
    /* no body */
  }

  // Only the 12:00-UK firing proceeds (unless forced for a manual run/test).
  if (!force && ukHour() !== 12) {
    return json({ skipped: 'not-noon-uk', ukHour: ukHour() })
  }
  if (!force && !dryRun && (await alreadyPostedThisWeek(supabase))) {
    return json({ skipped: 'already-posted-this-week' })
  }

  // Dry run: generate and return, but don't touch the table or the job log.
  if (dryRun) {
    const corpus = await readCorpus(supabase)
    const post = await generatePost(corpus, anthropicKey)
    if (!post) return json({ error: 'generation-failed' }, 502)
    return json({ dryRun: true, post })
  }

  // Real run. The post is inserted+published BEFORE the (slower) cover step, so even
  // if the cover generation is cut short the post is already live. pg_cron calls this
  // with a generous timeout so the ~60–90s run completes without the connection closing.
  const { data: job } = await supabase
    .from('generation_jobs')
    .insert({ type: 'weekly_auto', status: 'running', progress: 0, total: 1, message: 'Writing this week’s insight…' })
    .select()
    .single()
  const jobId = (job as { id: string } | null)?.id

  async function finishJob(fields: { status: string; message: string; progress?: number }) {
    if (jobId) await supabase.from('generation_jobs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', jobId)
  }

  try {
    const corpus = await readCorpus(supabase)
    const post = await generatePost(corpus, anthropicKey)
    if (!post) {
      await finishJob({ status: 'failed', message: 'Generation returned nothing' })
      return json({ error: 'generation-failed' }, 502)
    }

    const slug = await uniqueSlug(supabase, slugify(post.slug || post.title))
    const nowIso = new Date().toISOString()
    const { data: saved, error: insErr } = await supabase
      .from('blog_posts')
      .insert({
        title: post.title,
        slug,
        excerpt: post.excerpt,
        content: post.content,
        tags: post.tags ?? [],
        status: 'published',
        published_at: nowIso,
        cta_label: CTA_LABEL,
        cta_url: CTA_URL,
        updated_at: nowIso,
      })
      .select('id, title')
      .single()

    if (insErr || !saved) {
      await finishJob({ status: 'failed', message: `Insert failed: ${insErr?.message ?? 'unknown'}` })
      return json({ error: 'insert-failed', details: insErr }, 500)
    }

    const savedRow = saved as { id: string; title: string }

    // Cover is best-effort — the post is already live without it.
    if (openaiKey) {
      const url = await generateImage(post.title, post.excerpt, anthropicKey, openaiKey, supabase)
      if (url) {
        await supabase.from('blog_posts').update({ cover_image_url: url, updated_at: new Date().toISOString() }).eq('id', savedRow.id)
      }
    }

    await finishJob({ status: 'complete', message: `Published: ${savedRow.title}`, progress: 1 })
    return json({ ok: true, id: savedRow.id, title: savedRow.title, slug })
  } catch (err) {
    await finishJob({ status: 'failed', message: err instanceof Error ? err.message : 'Unknown error' })
    return json({ error: (err as Error).message }, 500)
  }
})

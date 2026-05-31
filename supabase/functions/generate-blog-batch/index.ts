// Batch generation for the Insights Content Engine. Takes a theme + a set of date
// slots, writes one post per slot (Claude Opus), then generates a cover for each
// (gpt-image-1). Runs in the background via EdgeRuntime.waitUntil and reports
// progress through a generation_jobs row. Admin-gated at the door.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, isAuthorisedAdmin } from '../_shared/auth.ts'

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void }

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function updateJob(
  supabase: Supa,
  jobId: string,
  fields: { status?: string; progress?: number; total?: number; message?: string },
) {
  await supabase
    .from('generation_jobs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function generatePost(
  theme: string,
  previousTitles: string[],
  anthropicKey: string,
): Promise<{ title: string; slug: string; excerpt: string; content: string; tags: string[] } | null> {
  const avoidLine = previousTitles.length > 0
    ? `\n\nIMPORTANT: Do NOT reuse any of these titles or closely related topics (already covered):\n${previousTitles.map((t) => `- ${t}`).join('\n')}`
    : ''

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
        content: `You are writing for Outgrow Okay's Insights blog. ${VOICE}

Generate ONE post on this theme: "${theme}"${avoidLine}

The post should be:
- 600-900 words of substantive, practical content
- Written for founders and operators, not engineers
- Specific and actionable — not generic advice
- Include a real scenario or example where it helps

CRITICAL WRITING RULES — apply to every sentence, not just the opening:

BANNED OPENERS — never start the post or any paragraph with:
- "Many businesses" / "Most businesses" / "Every business" (or owner/founder variants)
- "Every day" / "Every week" / "Every [anything]" as a paragraph opener
- Any generic plural opener that could apply to anyone anywhere

The very first sentence MUST be one of:
- A specific scenario the reader recognises
- A direct statement or bold claim
- A question that challenges an assumption
- A specific number or statistic
- A short punchy observation

Each paragraph opens with something specific and varied: scenarios, direct statements, questions, numbers, or second-person "You" statements.

Good openings:
"Your invoice was due three weeks ago. The customer has seen it. They just haven't paid it."
"The spreadsheet has 47 tabs. Nobody knows what half of them do."
"You are the only person who knows how the quoting works. That is the problem."

Return ONLY a valid JSON object with exactly these fields:
{
  "title": "Post title",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence summary for listings",
  "content": "Full markdown content of the post",
  "tags": ["tag1", "tag2", "tag3"]
}

No markdown fences, no explanation — just the raw JSON object.`,
      }],
    }),
  })

  const data = await res.json()
  if (!res.ok) return null
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
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
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1536x1024',
        quality: 'medium',
      }),
    })
    const iData = await iRes.json()
    const b64 = iData.data?.[0]?.b64_json
    if (!b64) return null

    const binary = atob(b64)
    const imgBytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i)

    const fileName = `covers/batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, imgBytes, { contentType: 'image/png', upsert: false })
    if (uploadError) return null

    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(fileName)
    return publicUrl
  } catch {
    return null
  }
}

async function runPipeline(
  jobId: string,
  theme: string,
  slots: string[],
  previousTitles: string[],
  supabase: Supa,
  anthropicKey: string,
  openaiKey: string | null,
  backfill: boolean,
) {
  const titlesUsed = [...previousTitles]
  const savedPosts: { id: string; title: string; excerpt: string }[] = []

  try {
    // Phase 1: write + save posts.
    for (let i = 0; i < slots.length; i++) {
      await updateJob(supabase, jobId, {
        message: `Writing post ${i + 1} of ${slots.length}…`,
        progress: i,
        total: slots.length * 2,
      })

      const post = await generatePost(theme, titlesUsed, anthropicKey)
      if (!post) continue
      titlesUsed.push(post.title)

      const { data: saved } = await supabase
        .from('blog_posts')
        .insert({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          tags: post.tags,
          status: backfill ? 'published' : 'pending_review',
          scheduled_at: backfill ? null : slots[i],
          published_at: backfill ? slots[i] : null,
          updated_at: new Date().toISOString(),
        })
        .select('id, title, excerpt')
        .single()

      if (saved) savedPosts.push(saved as { id: string; title: string; excerpt: string })
    }

    // Phase 2: cover images.
    if (openaiKey) {
      for (let i = 0; i < savedPosts.length; i++) {
        const post = savedPosts[i]
        await updateJob(supabase, jobId, {
          message: `Generating cover ${i + 1} of ${savedPosts.length}…`,
          progress: slots.length + i,
        })
        const url = await generateImage(post.title, post.excerpt, anthropicKey, openaiKey, supabase)
        if (url) {
          await supabase
            .from('blog_posts')
            .update({ cover_image_url: url, updated_at: new Date().toISOString() })
            .eq('id', post.id)
        }
      }
    }

    await updateJob(supabase, jobId, {
      status: 'complete',
      message: `Generated ${savedPosts.length} post${savedPosts.length !== 1 ? 's' : ''}`,
      progress: slots.length * 2,
    })
  } catch (err) {
    await updateJob(supabase, jobId, {
      status: 'failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!(await isAuthorisedAdmin(req))) {
    return json({ error: 'Not authorised' }, 403)
  }

  try {
    const { theme, slots, previousTitles = [], backfill = false } = await req.json() as {
      theme: string
      slots: string[]
      previousTitles?: string[]
      backfill?: boolean
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? null
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)
    if (!serviceKey) return json({ error: 'service role key not set' }, 500)
    if (!Array.isArray(slots) || slots.length === 0) {
      return json({ error: 'No slots provided' }, 400)
    }

    // Service-role client for server-side writes (bypasses RLS).
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: job, error: jobErr } = await supabase
      .from('generation_jobs')
      .insert({
        type: 'blog_batch',
        status: 'running',
        progress: 0,
        total: slots.length * 2,
        message: `Starting — ${slots.length} post${slots.length !== 1 ? 's' : ''} queued`,
      })
      .select()
      .single()

    if (jobErr || !job) return json({ error: 'Failed to create job', details: jobErr }, 500)

    EdgeRuntime.waitUntil(
      runPipeline(job.id as string, theme, slots, previousTitles, supabase, anthropicKey, openaiKey, backfill),
    )

    return json({ job_id: job.id, status: 'running' })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

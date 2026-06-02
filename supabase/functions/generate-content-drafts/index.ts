// Signal: turn an anonymised consulting finding into LinkedIn-ready post drafts.
//
// Input: { insight_id?, raw_text?, variant_count?=3, cta_type?: 'report'|'call'|'none' }
//   - If insight_id is given, the insight is loaded and REJECTED unless anonymised === true.
//     This is the hard gate: only anonymised material is ever sent to the model.
//   - raw_text is an alternative free-text source (already anonymised by the founder).
//
// Output: writes one content_posts row per variant (status 'drafted'), linked to the
// insight, with cta_type carried through. The insight is flipped to status 'used'.
//
// The system NEVER publishes. This only produces drafts a human reviews and pastes.
// Manual trigger only — no cron. Admin-gated at the door.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, isAuthorisedAdmin } from '../_shared/auth.ts'

// Model: Sonnet 4.5 — strong copy at a fraction of Opus cost, matches the 4.5 line
// the rest of the OO functions run on.
const MODEL = 'claude-sonnet-4-5'

// First-person founder voice for LinkedIn. Diagnostic, not promotional.
const SYSTEM = `You are the founder of Outgrow Okay, a Northern Ireland consultancy that helps \
founders and small teams stop being the bottleneck — by building the systems, automation and AI \
that let a business run without them in every loop.

You write your own LinkedIn posts. The voice is FIRST PERSON ("I", "we"), plain-talking and direct. \
You are a sharp operator talking to other operators. You are diagnostic, not promotional: you share \
something you actually saw or worked out, and let the reader recognise it in their own business.

HARD RULES:
- Honest and specific. No hype, no buzzwords, no "game-changer / unlock / leverage / synergy".
- Never invent fake numbers, fake clients, or fake testimonials. Use only what's in the source.
- Anonymise: never name a client, never give identifying detail. "A services firm I worked with" is fine.
- Sound like a person typed it, not a brand. Contractions are good. Short sentences.

LINKEDIN MECHANICS:
- The FIRST LINE is the hook. It must work as a standalone opener of roughly 210 characters or less,
  because LinkedIn truncates the rest behind "...more". Make someone stop scrolling without clickbait.
- Plaintext only. No markdown — no **bold**, no headings, no "- " bullets. If you want a list, use
  short lines or a "•" character. Line breaks and white space are your only formatting.
- Length: roughly 80–200 words total. Tight beats long.
- End with a soft, low-pressure call to action that matches the requested CTA type:
    report → invite them to a free/quick digital-presence or systems read, no hard sell
    call   → invite them to a short conversation if it resonates
    none   → no CTA; end on the insight itself
  Keep any CTA to one short line. Never beg for likes/comments/shares.`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface Variant {
  hook: string
  body: string
  variant_label: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!(await isAuthorisedAdmin(req))) {
    return json({ error: 'Not authorised' }, 403)
  }

  try {
    const {
      insight_id,
      raw_text,
      variant_count = 3,
      cta_type = 'none',
    } = (await req.json()) as {
      insight_id?: string
      raw_text?: string
      variant_count?: number
      cta_type?: 'report' | 'call' | 'none'
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)
    if (!serviceKey) return json({ error: 'service role key not set' }, 500)

    const validCta = cta_type === 'report' || cta_type === 'call' ? cta_type : 'none'
    const count = Math.min(Math.max(Number(variant_count) || 3, 1), 5)

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // ── Resolve the source material ───────────────────────────────────────────
    let sourceBlock = ''
    let insight: {
      id: string
      summary: string
      detail: string | null
      sector: string | null
      metric: string | null
      anonymised: boolean
    } | null = null

    if (insight_id) {
      const { data, error } = await supabase
        .from('content_insights')
        .select('id, summary, detail, sector, metric, anonymised')
        .eq('id', insight_id)
        .single()

      if (error || !data) return json({ error: 'Insight not found' }, 404)
      insight = data as typeof insight

      // HARD GATE: only anonymised insights may be generated from.
      if (insight!.anonymised !== true) {
        return json({ error: 'Insight is not marked anonymised — cannot generate.' }, 400)
      }

      sourceBlock = [
        `Summary: ${insight!.summary}`,
        insight!.detail ? `Detail: ${insight!.detail}` : '',
        insight!.sector ? `Sector: ${insight!.sector}` : '',
        insight!.metric ? `Metric / result: ${insight!.metric}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    } else if (raw_text && raw_text.trim()) {
      sourceBlock = raw_text.trim()
    } else {
      return json({ error: 'Provide either insight_id or raw_text' }, 400)
    }

    // ── Generate ──────────────────────────────────────────────────────────────
    const userPrompt = `Here is an anonymised finding from my consulting work. Turn it into \
${count} DIFFERENT LinkedIn post${count === 1 ? '' : 's'} — each taking a genuinely different angle \
on the same material (e.g. one tells it as a story, one leads with the cost of inaction, one frames \
it as a question, one is a short blunt observation). Do not just reword the same post.

Requested CTA type: ${validCta}

SOURCE FINDING:
${sourceBlock}

Return ONLY a JSON array (no prose, no markdown fences) of exactly ${count} object${count === 1 ? '' : 's'}, \
each shaped:
[
  { "hook": "the first line / scroll-stopper, <=210 chars", "body": "the full post as LinkedIn-ready plaintext INCLUDING the hook as its first line", "variant_label": "a 2-4 word label for this angle" }
]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return json({ error: 'Anthropic request failed', details: data }, 502)
    }

    let text: string = data.content?.[0]?.text ?? ''
    // Strip ```json fences if the model added them.
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

    let variants: Variant[]
    try {
      const match = text.match(/\[[\s\S]*\]/)
      variants = JSON.parse(match ? match[0] : text)
      if (!Array.isArray(variants)) throw new Error('not an array')
    } catch {
      return json({ error: 'Could not parse model output', raw: text }, 502)
    }

    // ── Persist drafts ──────────────────────────────────────────────────────
    const rows = variants
      .filter((v) => v && typeof v.body === 'string' && v.body.trim())
      .map((v) => ({
        insight_id: insight?.id ?? null,
        body: v.body.trim(),
        hook: v.hook?.trim() ?? null,
        variant_label: v.variant_label?.trim() ?? null,
        cta_type: validCta,
        status: 'drafted',
      }))

    if (rows.length === 0) {
      return json({ error: 'Model returned no usable variants', raw: text }, 502)
    }

    const { data: inserted, error: insErr } = await supabase
      .from('content_posts')
      .insert(rows)
      .select('id, hook, variant_label, status')

    if (insErr) return json({ error: 'Failed to save drafts', details: insErr }, 500)

    // Mark the insight as used (best effort — drafts already saved).
    if (insight?.id) {
      await supabase
        .from('content_insights')
        .update({ status: 'used' })
        .eq('id', insight.id)
    }

    return json({ success: true, count: inserted?.length ?? 0, posts: inserted })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

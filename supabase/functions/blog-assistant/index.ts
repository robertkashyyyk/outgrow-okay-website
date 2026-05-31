// Insights AI assistant for the Outgrow Okay Studio. Three modes:
//   - assist (default): a writing collaborator for long-form Insights posts
//   - tags: suggest a few short tags for a post
//   - newsletter: draft a weekly newsletter from a set of posts
// Admin-gated: only a signed-in admin (or a trusted server with the service-role
// key) may spend API tokens here. The gateway has already validated the JWT.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, isAuthorisedAdmin } from '../_shared/auth.ts'

// Voice: plain-talking, specific, no corporate filler. Outgrow Okay helps founders
// and small teams get out of the day-to-day by building systems and automation.
const VOICE = `Outgrow Okay helps founders and small teams stop being the bottleneck — \
by building the systems, automation and AI that let a business run without them in every loop. \
The writing voice is plain-talking and direct: short sentences, concrete examples, no corporate \
jargon, no hype. Honest about trade-offs. It reads like a sharp operator talking to another \
operator, not a marketing brochure.`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function anthropic(key: string, payload: Record<string, unknown>) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!(await isAuthorisedAdmin(req))) {
    return json({ error: 'Not authorised' }, 403)
  }

  try {
    const body = await req.json()
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

    // ── Mode: newsletter ──────────────────────────────────────────────────────
    if (body.mode === 'newsletter') {
      const { posts } = body as {
        posts: { title: string; excerpt: string; slug: string }[]
      }
      const postList = posts
        .map((p, i) => `${i + 1}. "${p.title}" — ${p.excerpt ?? 'No excerpt'}`)
        .join('\n')

      const { ok, data } = await anthropic(anthropicKey, {
        model: 'claude-opus-4-5',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are writing a newsletter for Outgrow Okay. ${VOICE}

This issue's Insights posts:
${postList}

Write the newsletter with these sections:
1. A short, warm opening (2-3 sentences) — no fluff.
2. "Worth reading" — for each post, a 2-sentence teaser that adds a real observation or question, not just a summary.
3. "What we're seeing" — 1-2 short paragraphs of practical insight on systems, automation and getting out of the day-to-day. Generic, no client names.
4. THREE versions of a closing CTA (clearly label each):
   - PROSPECTS: "Book a discovery call" linking to /book
   - WARM (read a few posts, not booked yet): "See how we work" linking to /insights
   - CLIENTS: "Pick up where we left off" linking to /portal

Return ONLY a JSON object:
{
  "subject": "email subject line (compelling, under 60 chars)",
  "content_text": "plain text version of the full newsletter",
  "content_html": "HTML version using only <h2>, <p>, <ul>, <li>, <a href> tags. No inline styles."
}`,
        }],
      })

      if (!ok) return json({ error: 'Anthropic error', details: data }, 500)
      const text = data.content?.[0]?.text ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return json({ error: 'No JSON in response', raw: text }, 500)
      return new Response(match[0], {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Mode: tags ────────────────────────────────────────────────────────────
    if (body.mode === 'tags') {
      const { title, excerpt } = body as { title: string; excerpt: string }
      const { data } = await anthropic(anthropicKey, {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Suggest 3-5 short tags for this Insights post. Lowercase, 1-3 words each, specific and useful for a blog about systems, automation and AI for small businesses. Avoid generic words like "business" or "growth" on their own.

Title: "${title}"
Excerpt: "${excerpt ?? ''}"

Return ONLY a JSON array of strings. Example: ["workflow automation", "delegation", "ai agents"]. Nothing else.`,
        }],
      })
      const text = data.content?.[0]?.text ?? '[]'
      const match = text.match(/\[[\s\S]*?\]/)
      const tags = match ? JSON.parse(match[0]) : []
      return json({ tags })
    }

    // ── Mode: assist (default) ────────────────────────────────────────────────
    const { messages: incoming } = body as {
      messages: { role: string; content: unknown }[]
    }

    const { ok, data } = await anthropic(anthropicKey, {
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: `You are a writing assistant for Outgrow Okay's Insights blog. ${VOICE}

You help write and improve long-form posts about systems, automation, AI, delegation and getting founders out of the day-to-day. When asked to write or improve content, return just the text — no meta-commentary, no "here's your draft". When asked a question, answer concisely. Prefer concrete examples and actionable takeaways over abstractions.`,
      messages: incoming.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
    })

    if (!ok) return json({ error: 'Anthropic error', details: data }, 500)
    const suggestion = data.content?.[0]?.text ?? ''
    return json({ suggestion })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

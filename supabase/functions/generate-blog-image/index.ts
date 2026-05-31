// Cover-image generation for Insights posts. Claude Haiku writes a tight image
// prompt in the Outgrow Okay aesthetic, DALL-E 3 renders it, and the result is
// stored in the public `blog-images` bucket. Admin-gated.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, isAuthorisedAdmin } from '../_shared/auth.ts'

// OO visual language: warm neutral "bone" paper and deep "ink", with a single
// restrained ochre accent. Calm, editorial, never busy. Explicitly NOT the old
// Kashyyyk forest-green/amber look.
const AESTHETIC =
  'warm neutral palette — bone/off-white paper and deep near-black ink, with a single ' +
  'restrained ochre/burnt-amber accent used sparingly. Calm, editorial, minimal, lots of ' +
  'negative space. Premium photography or clean abstract composition. No text, no logos, ' +
  'no busy detail.'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!(await isAuthorisedAdmin(req))) {
    return json({ error: 'Not authorised' }, 403)
  }

  try {
    const { title, excerpt } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500)

    // Tailor a DALL-E prompt to the post via Claude Haiku (falls back to a default).
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    let imagePrompt =
      `Editorial cover image for an article titled "${title}". ${AESTHETIC}`

    if (anthropicKey) {
      const promptRes = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: `Write a single DALL-E image prompt for a blog cover image. Title: "${title}". Excerpt: "${excerpt ?? ''}". Aesthetic: ${AESTHETIC} Evocative and premium, suggestive of the article's theme without being literal. Return only the prompt, nothing else.`,
          }],
        }),
      })
      const promptData = await promptRes.json()
      if (promptRes.ok && promptData.content?.[0]?.text) {
        imagePrompt = promptData.content[0].text.trim()
      }
    }

    // Render with gpt-image-1 (OpenAI's current image model). It returns base64
    // directly — no separate download step. 1536x1024 is the wide "landscape"
    // option, the closest match to a blog cover ratio.
    const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1536x1024',
        quality: 'medium',
      }),
    })
    const imageData = await imageRes.json()
    if (!imageRes.ok) return json({ error: 'Image generation error', details: imageData }, 500)

    const b64 = imageData.data?.[0]?.b64_json ?? null
    if (!b64) throw new Error('No image data returned from OpenAI')

    // Decode base64 → bytes.
    const binary = atob(b64)
    const imgBytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i)

    // Upload to OO's own storage with the service role (never a hardcoded URL).
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceKey)

    const fileName = `covers/ai-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, imgBytes, { contentType: 'image/png', upsert: false })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(fileName)

    return json({ url: publicUrl, prompt: imagePrompt })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

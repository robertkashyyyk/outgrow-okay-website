// Create a one-off Stripe Checkout Session for a proposal's amount.
//
// The customer (Portal user) calls this with their JWT. We read the proposal THROUGH
// their auth so RLS guarantees they can only pay for their own client's published
// proposal — and we take the amount from the DB, never from the request body, so the
// price can't be tampered with. Returns the hosted Stripe Checkout URL to redirect to.
//
// Secrets: STRIPE_SECRET_KEY (use sk_test_… while testing). SUPABASE_URL /
// SUPABASE_ANON_KEY are auto-injected. Optional SITE_URL (default outgrowokay.com).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://outgrowokay.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not set' }, 500)

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Not authorised' }, 401)

    const { slug } = (await req.json()) as { slug?: string }
    if (!slug) return json({ error: 'Missing slug' }, 400)

    // Read the proposal AS THE CALLER — RLS limits this to their own published one.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    )

    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id, client_id, title, slug, amount_pence, currency, paid_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)
    if (!proposal) return json({ error: 'Proposal not found' }, 404)
    if (proposal.amount_pence == null || proposal.amount_pence <= 0) {
      return json({ error: 'This proposal has no payable amount.' }, 400)
    }
    if (proposal.paid_at) return json({ error: 'Already paid.' }, 409)

    // Who is paying (for the receipt / prefilled email).
    const { data: userData } = await supabase.auth.getUser()
    const email = userData?.user?.email ?? undefined

    // Build the Checkout Session via Stripe's REST API (form-encoded).
    const form = new URLSearchParams()
    form.set('mode', 'payment')
    form.set('success_url', `${SITE_URL}/portal/proposals/${proposal.slug}?paid=1`)
    form.set('cancel_url', `${SITE_URL}/portal/proposals/${proposal.slug}`)
    form.set('line_items[0][quantity]', '1')
    form.set('line_items[0][price_data][currency]', proposal.currency ?? 'gbp')
    form.set('line_items[0][price_data][unit_amount]', String(proposal.amount_pence))
    form.set('line_items[0][price_data][product_data][name]', proposal.title)
    form.set('metadata[proposal_id]', proposal.id)
    form.set('metadata[slug]', proposal.slug)
    form.set('metadata[client_id]', proposal.client_id)
    if (email) form.set('customer_email', email)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const session = await res.json()
    if (!res.ok) {
      return json({ error: session?.error?.message ?? 'Stripe error' }, 502)
    }

    return json({ url: session.url })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

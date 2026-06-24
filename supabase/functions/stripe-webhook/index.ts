// Stripe webhook → mark a proposal paid.
//
// Stripe can't present a Supabase JWT, so this function runs with verify_jwt = false
// and authenticates the request itself by verifying the Stripe-Signature header
// against STRIPE_WEBHOOK_SECRET. On checkout.session.completed (paid), it stamps
// proposals.paid_at using the service role (bypassing RLS).
//
// Secrets: STRIPE_WEBHOOK_SECRET (whsec_…), SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_URL (auto-injected).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const enc = new TextEncoder()

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Verify Stripe's `t=…,v1=…` signature scheme over `${t}.${payload}`.
async function verify(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=') as [string, string]),
  )
  const t = parts['t']
  const v1 = parts['v1']
  if (!t || !v1) return false

  // Reject very old timestamps (replay protection): 5-minute tolerance.
  const age = Math.abs(Date.now() / 1000 - Number(t))
  if (Number.isFinite(age) && age > 300) return false

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`))
  const expected = hex(mac)
  // Constant-time-ish compare.
  if (expected.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return new Response('Webhook secret not set', { status: 500 })

  const sig = req.headers.get('Stripe-Signature') ?? ''
  const payload = await req.text()

  if (!(await verify(payload, sig, secret))) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(payload)

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object ?? {}
    const proposalId = session.metadata?.proposal_id
    if (session.payment_status === 'paid' && proposalId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
      await supabase
        .from('proposals')
        .update({ paid_at: new Date().toISOString(), stripe_session_id: session.id })
        .eq('id', proposalId)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

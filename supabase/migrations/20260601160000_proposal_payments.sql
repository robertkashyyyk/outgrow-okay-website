-- Outgrow Okay: payment fields for proposals.
--
-- A proposal can carry a price. When `amount_pence` is set, the Portal shows an
-- "Approve & pay" button that opens a one-off Stripe Checkout for exactly that amount
-- (the value is read server-side at checkout time — the browser never supplies it).
-- `paid_at` is stamped by the Stripe webhook when payment completes.
--
-- Amount is stored in minor units (pence) as an integer — never a float — because
-- that's what Stripe expects and it avoids rounding error on money.

alter table public.proposals
  add column if not exists amount_pence      integer
    check (amount_pence is null or amount_pence >= 0),
  add column if not exists currency          text not null default 'gbp',
  add column if not exists paid_at           timestamptz,
  add column if not exists stripe_session_id text;

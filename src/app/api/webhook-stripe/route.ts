import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { cards, payments } from '@/db/schema';
import { db } from '@/db';
import { eq, or } from 'drizzle-orm';

const STRIPE_API_VERSION = '2025-07-30.basil';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_KEY!
    );
  } catch (err) {
    console.error('[POST /api/webhook-stripe] error:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'issuing_authorization.request') {
    const auth = event.data.object;
    const stripeCardId = auth.card.id;

    const card = await db.query.cards.findFirst({
      where: or(eq(cards.stripeCardId, stripeCardId)),
    });
    if (!card) {
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason: 'card_not_found' },
        }),
        {
          status: 200,
          headers: {
            'Stripe-Version': STRIPE_API_VERSION,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const exists = await db.query.payments.findFirst({
      where: eq(payments.paymentId, auth.id),
    });
    if (!exists) {
      const pr = auth.pending_request!;
      await db.insert(payments).values({
        cardId: card.id,
        paymentId: auth.id,
        amount: String(pr.amount),
        currency: pr.currency.toUpperCase(),
        merchant_name: auth.merchant_data.name ?? 'no_name',
        merchant_amount: String(pr.merchant_amount),
        merchant_currency: pr.merchant_currency.toUpperCase(),
        status: 'started',
      });
    }

    return new Response(JSON.stringify({ approved: true }), {
      status: 200,
      headers: {
        'Stripe-Version': STRIPE_API_VERSION,
        'Content-Type': 'application/json',
      },
    });
  }

  if (event.type === 'issuing_authorization.created') {
    const auth = event.data.object as Stripe.Issuing.Authorization;

    const existing = await db.query.payments.findFirst({
      where: eq(payments.paymentId, auth.id),
    });
    if (!existing) {
      // i should create the payment object if this conditional happens
      return new Response('ok', { status: 200 });
    }

    await db
      .update(payments)
      .set({
        status: auth.approved ? 'completed' : 'cancelled',
        amount: String(auth.amount),
        currency: auth.currency.toUpperCase(),
        merchant_amount: String(auth.merchant_amount),
        merchant_currency: auth.merchant_currency.toUpperCase(),
        merchant_name: auth.merchant_data.name ?? existing.merchant_name,
      })
      .where(eq(payments.id, existing.id));

    return new Response('ok', { status: 200 });
  }

  return new Response('ignored', { status: 200 });
}

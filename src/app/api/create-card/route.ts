import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import z from 'zod';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

const BodySchema = z.object({
  cardholderId: z.string().min(1), // ich_...
  currency: z.string().default('gbp'),
  activate: z.boolean().default(true),
  exp_month: z.number().int().min(1).max(12).optional(),
  exp_year: z.number().int().min(2000).max(2100).optional(),
  metadata: z.record(z.string(), z.number()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = BodySchema.parse(body);

    const idempotencyKey =
      req.headers.get('Idempotency-Key') ?? `vc_${randomUUID()}`;

    const params: Stripe.Issuing.CardCreateParams = {
      cardholder: data.cardholderId,
      currency: data.currency,
      type: 'virtual',
      status: data.activate ? 'active' : undefined,
      ...(data.exp_month && data.exp_year
        ? { exp_month: data.exp_month, exp_year: data.exp_year }
        : {}),
      metadata: data.metadata,
    };

    const card = await stripe.issuing.cards.create(params, { idempotencyKey });

    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error('[POST /api/create-card] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

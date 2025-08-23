import z from 'zod';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { isAddress } from 'viem';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { cards, users } from '@/db/schema';

const STRIPE_API_VERSION = '2025-07-30.basil';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

// prettier-ignore
const BodySchema = z.object({
  user: z.object({
    name: z.string().min(1).transform((s) => s.trim()),
    address: z.string().min(1).transform((s) => s.trim().toLowerCase()).refine((a) => isAddress(a), { message: 'Invalid EVM address' }),
    provider: z.enum(['gmail', 'apple', 'wallet']),
  }),
  cardholder: z.object({
    name: z.string().min(1), // display name (~24 chars suggested)
    individual: z.object({
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      dob: z.object({
        day: z.number().int().min(1).max(31),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(1900).max(2100),
      }),
    }),
    billing: z.object({
      address: z.object({
        line1: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postal_code: z.string().min(1),
        country: z.literal('GB').default('GB'),
        line2: z.string().optional(),
      }),
    }),
    email: z.email().optional(),
    phone_number: z.string().optional(),
    metadata: z.record(z.string(), z.number()).optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.treeifyError(parsed.error),
        },
        { status: 400 }
      );
    }

    const { user, cardholder } = parsed.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.address, user.address),
    });
    if (existing) {
      return NextResponse.json(
        { created: false, user: existing },
        { status: 200 }
      );
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        name: user.name,
        address: user.address,
        provider: user.provider,
      })
      .returning();

    const baseKey = req.headers.get('Idempotency-Key') ?? `op_${randomUUID()}`;

    const cardholderParams: Stripe.Issuing.CardholderCreateParams = {
      type: 'individual',
      status: 'active',
      name: cardholder.name,
      email: cardholder.email,
      phone_number: cardholder.phone_number,
      billing: {
        address: {
          line1: cardholder.billing.address.line1,
          line2: cardholder.billing.address.line2,
          city: cardholder.billing.address.city,
          state: cardholder.billing.address.state,
          postal_code: cardholder.billing.address.postal_code,
          country: cardholder.billing.address.country,
        },
      },
      individual: {
        first_name: cardholder.individual.first_name,
        last_name: cardholder.individual.last_name,
        dob: {
          day: cardholder.individual.dob.day,
          month: cardholder.individual.dob.month,
          year: cardholder.individual.dob.year,
        },
      },
      metadata: cardholder.metadata,
    };
    const createdCardholder = await stripe.issuing.cardholders.create(
      cardholderParams,
      { idempotencyKey: `${baseKey}:cardholder` }
    );

    const cardParams: Stripe.Issuing.CardCreateParams = {
      cardholder: createdCardholder.id,
      currency: 'gbp',
      type: 'virtual',
      status: 'active',
    };
    const createdCard = await stripe.issuing.cards.create(cardParams, {
      idempotencyKey: `${baseKey}:card`,
    });

    const [createdDbCard] = await db
      .insert(cards)
      .values({
        userId: createdUser.id,
        stripeCardId: createdCard.id,
        stripeCardHolderId: createdCardholder.id,
        name: createdCard.cardholder.name,
        brand: createdCard.brand,
        last4: createdCard.last4,
        status: 'active',
      })
      .returning();

    const res = NextResponse.json(
      {
        created: true,
        user: createdUser,
        cardholder: createdCardholder,
        card: createdCard,
        createdDbCard,
      },
      { status: 201 }
    );

    // 5m
    const COOKIE_MAX_AGE = 300;

    res.cookies.set({
      name: 'ob',
      value: '1',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    res.cookies.set({
      name: 'ob_addr',
      value: user.address.toLowerCase(),
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error('[POST /api/create-user] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

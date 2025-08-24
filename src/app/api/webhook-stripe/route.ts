import Stripe from 'stripe';
import { eq, or } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { monadTestnet } from 'viem/chains';
import { createPublicClient, erc20Abi, http } from 'viem';

import { db } from '@/db';
import { cards, payments, users } from '@/db/schema';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = process.env.MONAD_RPC_URL!;
const EXECUTOR_PK = process.env.EXECUTOR_PRIVATE_KEY! as `0x${string}`;
const USDC_ADDRESS = process.env.USDC_ADDRESS! as `0x${string}`;

const account = privateKeyToAccount(EXECUTOR_PK);
const transport = http(RPC_URL);
const publicClient = createPublicClient({ chain: monadTestnet, transport });

const STRIPE_API_VERSION = '2025-07-30.basil';
const HEADERS = {
  'Stripe-Version': STRIPE_API_VERSION,
  'Content-Type': 'application/json',
};
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

function getGbpUsdTodayFake() {
  const rate = 1.27;
  const asOf = new Date().toISOString().slice(0, 10);
  return { rate, asOf };
}
function gbpMinorToUsdcMinorToday(gbpMinor: string | bigint) {
  const { rate, asOf } = getGbpUsdTodayFake();

  const pence = BigInt(String(gbpMinor));
  if (pence <= BigInt(0)) {
    return {
      asOf,
      gbpUsd: rate,
      gbpMinor: '0',
      usdcMinor: '0',
    };
  }

  const ceilDiv = (a: bigint, b: bigint) => (a + b - BigInt(1)) / b;

  const RATE_SCALE = BigInt(1_000_000);
  const rateScaled = BigInt(Math.round(rate * Number(RATE_SCALE)));
  const SCALE_DIFF = BigInt(10_000);

  const numerator = pence * SCALE_DIFF * rateScaled;
  const usdcMinor = ceilDiv(numerator, RATE_SCALE);

  return {
    asOf,
    gbpUsd: rate,
    gbpMinor: pence.toString(),
    usdcMinor: usdcMinor.toString(),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature', {
      status: 400,
      headers: HEADERS,
    });
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
    return new Response('Invalid signature', { status: 400, headers: HEADERS });
  }

  if (event.type === 'issuing_authorization.request') {
    const auth = event.data.object;
    const stripeCardId = auth.card.id;

    const row = await db
      .select({
        card: {
          id: cards.id,
        },
        user: {
          id: users.id,
          address: users.address,
        },
      })
      .from(cards)
      .innerJoin(users, eq(cards.userId, users.id))
      .where(eq(cards.stripeCardId, stripeCardId))
      .limit(1)
      .then((r) => r[0]);

    if (!row) {
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason: 'card_not_found' },
        }),
        {
          status: 200,
          headers: HEADERS,
        }
      );
    }
    if (!row.user?.id) {
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason: 'user_not_found' },
        }),
        {
          status: 200,
          headers: HEADERS,
        }
      );
    }

    const { card, user } = row;

    const pr = auth.pending_request!;
    const inserted = await db
      .insert(payments)
      .values({
        cardId: card.id,
        paymentId: auth.id,
        amount: String(pr.amount),
        currency: pr.currency.toUpperCase(),
        merchant_name: auth.merchant_data.name ?? 'no_name',
        merchant_amount: String(pr.merchant_amount),
        merchant_currency: pr.merchant_currency.toUpperCase(),
        status: 'started',
      })
      .onConflictDoNothing()
      .returning();
    const payment =
      inserted[0] ??
      (await db.query.payments.findFirst({
        where: eq(payments.paymentId, auth.id),
      }));

    const owner = user.address as `0x${string}`;
    const [allowance, balance] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, account.address],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      }) as Promise<bigint>,
    ]);

    const gbpMinor = String(payment.amount);
    const fx = gbpMinorToUsdcMinorToday(gbpMinor);
    const usdcMinor = BigInt(fx.usdcMinor);

    if (allowance < usdcMinor) {
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason: 'insufficient_usdc_allowance' },
        }),
        {
          status: 200,
          headers: HEADERS,
        }
      );
    }
    if (balance < usdcMinor) {
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason: 'insufficient_usdc_balance' },
        }),
        {
          status: 200,
          headers: HEADERS,
        }
      );
    }

    return new Response(JSON.stringify({ approved: true }), {
      status: 200,
      headers: HEADERS,
    });
  }

  if (event.type === 'issuing_authorization.created') {
    const auth = event.data.object as Stripe.Issuing.Authorization;

    const payment = await db.query.payments.findFirst({
      where: eq(payments.paymentId, auth.id),
    });
    if (!payment) {
      // i should create the payment object if this conditional happens
      return new Response('ok', {
        status: 200,
        headers: HEADERS,
      });
    }

    await db
      .update(payments)
      .set({
        status: auth.approved ? 'completed' : 'cancelled',
        amount: String(auth.amount),
        currency: auth.currency.toUpperCase(),
        merchant_amount: String(auth.merchant_amount),
        merchant_currency: auth.merchant_currency.toUpperCase(),
        merchant_name: auth.merchant_data.name ?? payment.merchant_name,
      })
      .where(eq(payments.id, payment.id));

    if (auth.approved) {
      try {
        const base = `${process.env.NEXT_PUBLIC_BASE_URL}/api/execute-payment`;
        const execRes = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: payment.id }),
          cache: 'no-store',
        });

        if (!execRes.ok) {
          const text = await execRes.text().catch(() => '');
          console.error('[execute-payment] non-200', execRes.status, text);
        }
      } catch (e) {
        console.error('[execute-payment] call failed', e);
      }
    }

    return new Response('ok', {
      status: 200,
      headers: HEADERS,
    });
  }

  return new Response('ignored', {
    status: 200,
    headers: HEADERS,
  });
}

import z from "zod";
import { eq } from "drizzle-orm";
import { erc20Abi } from "viem";
import { monadTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";

import { db } from "@/db";
import { users, cards, payments, executions, transfers } from "@/db/schema";
import { broadcastAwardPoints } from "@/lib/points";

const RPC_URL = process.env.MONAD_RPC_URL!;
const EXECUTOR_PK = process.env.EXECUTOR_PRIVATE_KEY! as `0x${string}`;
const USDC_ADDRESS = process.env.USDC_ADDRESS! as `0x${string}`;
const TREASURY = process.env.TREASURY_ADDRESS! as `0x${string}`;

const account = privateKeyToAccount(EXECUTOR_PK);
const transport = http(RPC_URL);
const publicClient = createPublicClient({ chain: monadTestnet, transport });
const walletClient = createWalletClient({
  chain: monadTestnet,
  account,
  transport,
});

const BodySchema = z.object({
  paymentId: z.uuid(),
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
      gbpMinor: "0",
      usdcMinor: "0",
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
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { paymentId } = parsed.data;

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment) {
      return NextResponse.json(
        { error: "No completed payment for card" },
        { status: 404 }
      );
    }

    const already = await db.query.executions.findFirst({
      where: eq(executions.paymentId, payment.id),
    });
    if (already) {
      return NextResponse.json(
        { error: "Payment already executed", txHash: already.txHash },
        { status: 409 }
      );
    }

    const card = await db.query.cards.findFirst({
      where: eq(cards.id, payment.cardId),
    });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, card.userId),
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const owner = user.address as `0x${string}`;

    const [allowance, balance] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, account.address],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
      }) as Promise<bigint>,
    ]);

    const gbpMinor = String(payment.amount);
    const fx = gbpMinorToUsdcMinorToday(gbpMinor);
    const usdcMinor = BigInt(fx.usdcMinor);

    if (allowance < usdcMinor) {
      return NextResponse.json(
        {
          error: "Insufficient USDC allowance",
          needed: usdcMinor.toString(),
          allowance: allowance.toString(),
        },
        { status: 402 }
      );
    }
    if (balance < usdcMinor) {
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          needed: usdcMinor.toString(),
          balance: balance.toString(),
        },
        { status: 402 }
      );
    }

    const txHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "transferFrom",
      args: [owner, TREASURY, usdcMinor],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    await db.insert(executions).values({
      paymentId: payment.id,
      symbol: "USDC",
      amount: usdcMinor.toString(),
      decimals: 6,
      txHash,
    });
    await db.insert(transfers).values({
      userId: user.id,
      symbol: "USDC",
      amount: usdcMinor.toString(),
      decimals: 6,
      sender: owner,
      receiver: TREASURY,
      txHash,
    });

    const pointsAmount = usdcMinor / BigInt(1_000);
    if (pointsAmount > BigInt(0)) {
      try {
        const res = await broadcastAwardPoints({
          to: owner,
          amount: pointsAmount,
        });
        if ("error" in res) {
          console.error("[points-award] broadcast error", res.error);
        }
      } catch (error) {
        console.error("[points-award] unexpected failure", error);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        txHash,
        userAddress: owner,
        program: {
          currency: payment.currency,
          amountMinor: String(payment.amount),
        },
        merchant: {
          name: payment.merchant_name,
          currency: payment.merchant_currency,
          amountMinor: String(payment.merchant_amount),
        },
        usdc: {
          address: USDC_ADDRESS,
          amountMinor: usdcMinor.toString(),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[POST /api/execute-payment] error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

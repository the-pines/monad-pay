import { NextRequest, NextResponse } from "next/server";
import { Address, Hex, isAddress } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const MONAD_RPC_URL = process.env.MONAD_RPC_URL;
const SERVER_WALLET_PK = process.env.SERVER_WALLET_PRIVATE_KEY;

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const addr = String(json?.address ?? "")
      .trim()
      .toLowerCase();
    if (!isAddress(addr)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Only for first-time sign-in: skip if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.address, addr),
    });
    if (existing) {
      return NextResponse.json(
        { funded: false, reason: "user_exists" },
        { status: 200 }
      );
    }

    if (!MONAD_RPC_URL || !SERVER_WALLET_PK) {
      return NextResponse.json(
        { funded: false, reason: "server_wallet_unavailable" },
        { status: 200 }
      );
    }

    const pk = SERVER_WALLET_PK.startsWith("0x")
      ? (SERVER_WALLET_PK as Hex)
      : (("0x" + SERVER_WALLET_PK) as Hex);
    const account = privateKeyToAccount(pk);
    const publicClient = createPublicClient({ transport: http(MONAD_RPC_URL) });
    const wallet = createWalletClient({
      account,
      transport: http(MONAD_RPC_URL),
    });

    // Check server wallet balance first
    const serverBalance = await publicClient.getBalance({
      address: account.address,
    });
    const threshold = BigInt(1e17); // 0.1 MON (18 decimals)
    if (serverBalance < threshold) {
      return NextResponse.json(
        {
          funded: false,
          reason: "server_insufficient_balance",
          serverAddress: account.address,
          serverBalance: serverBalance.toString(),
        },
        { status: 200 }
      );
    }

    // Check user balance
    const balance = await publicClient.getBalance({ address: addr as Address });
    if (balance >= threshold) {
      return NextResponse.json(
        { funded: false, reason: "balance_sufficient" },
        { status: 200 }
      );
    }

    // Send flat 0.1 MON
    const value = threshold;
    try {
      const hash = await wallet.sendTransaction({
        to: addr as Address,
        value,
        // Explicit chain field to satisfy types when client is created without a chain
        chain: undefined,
      });
      return NextResponse.json({ funded: true, txHash: hash }, { status: 200 });
    } catch (sendErr) {
      console.error("[fund-mon] sendTransaction failed:", sendErr);
      return NextResponse.json(
        {
          funded: false,
          reason: "send_failed",
          error: (sendErr as Error)?.message ?? String(sendErr),
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("[POST /api/fund-mon] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

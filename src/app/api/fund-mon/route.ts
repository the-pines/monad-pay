import { NextRequest, NextResponse } from "next/server";
import { Address, Hex, isAddress, erc20Abi } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ERC20_TOKENS } from "@/config/tokens";

const MONAD_RPC_URL = process.env.MONAD_RPC_URL;
const SERVER_WALLET_PK = process.env.EXECUTOR_PRIVATE_KEY;

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const addr = String(json?.address ?? "")
      .trim()
      .toLowerCase();
    if (!isAddress(addr)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

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

    const balance = await publicClient.getBalance({ address: addr as Address });
    if (balance >= threshold) {
      return NextResponse.json(
        { funded: false, reason: "balance_sufficient" },
        { status: 200 }
      );
    }

    // Send 0.1 MON
    const value = threshold;
    let monTxHash: Hex | null = null;
    try {
      monTxHash = await wallet.sendTransaction({
        to: addr as Address,
        value,
        chain: undefined,
      });
      await publicClient.waitForTransactionReceipt({ hash: monTxHash });
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

    // Also try to fund up to 1 USDC directly from server wallet (no swap)
    let usdcFunded = false;
    let usdcTxHash: Hex | null = null;
    try {
      const usdc = ERC20_TOKENS.find((t) => t.symbol === "USDC");
      if (usdc) {
        const oneUsdc = BigInt(10) ** BigInt(usdc.decimals);
        const serverUsdcBalance = (await publicClient.readContract({
          address: usdc.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account.address],
        })) as bigint;
        const amountToSend =
          serverUsdcBalance >= oneUsdc ? oneUsdc : serverUsdcBalance;
        if (amountToSend > BigInt(0)) {
          usdcTxHash = await wallet.writeContract({
            chain: undefined,
            address: usdc.address as Address,
            abi: erc20Abi,
            functionName: "transfer",
            args: [addr as Address, amountToSend],
          });
          await publicClient.waitForTransactionReceipt({ hash: usdcTxHash });
          usdcFunded = true;
        }
      }
    } catch (usdcErr) {
      console.error("[fund-mon] USDC funding failed:", usdcErr);
      // do not fail the whole request; MON already funded
    }

    return NextResponse.json(
      {
        funded: true,
        mon: { funded: true, txHash: monTxHash },
        usdc: { funded: usdcFunded, txHash: usdcTxHash },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/fund-mon] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

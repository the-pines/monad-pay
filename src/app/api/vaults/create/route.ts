import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import type { Address, Chain } from "viem";

import { db } from "@/db";
import { users, vaults } from "@/db/schema";
import { VAULT_FACTORY_ABI, VAULT_FACTORY_ADDRESS } from "@/config/contracts";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.MONAD_RPC_URL!;
const EXECUTOR_PK = process.env.EXECUTOR_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

const BodySchema = z.object({
  owner: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
  name: z.string().min(1),
  isNative: z.boolean(),
  assetAddress: z
    .string()
    .optional()
    .transform((s) => (s ? s.trim().toLowerCase() : undefined)),
  goal: z.string().min(1), // decimal string from UI
  decimals: z.number().int().min(0).max(36),
});

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL || !EXECUTOR_PK) {
      return NextResponse.json(
        { error: "Server wallet unavailable" },
        { status: 503 }
      );
    }
    if (!VAULT_FACTORY_ADDRESS) {
      return NextResponse.json(
        { error: "Factory address not configured" },
        { status: 500 }
      );
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { owner, name, isNative, assetAddress, goal, decimals } = parsed.data;

    const account = privateKeyToAccount(EXECUTOR_PK);
    const transport = http(RPC_URL);
    const publicClient = createPublicClient({
      chain: monadTestnet as unknown as Chain,
      transport,
    });
    const walletClient = createWalletClient({
      chain: monadTestnet as unknown as Chain,
      account,
      transport,
    });

    const goalUnits = parseUnits(goal, decimals);

    const beforeVaults = (await publicClient.readContract({
      address: VAULT_FACTORY_ADDRESS,
      abi: VAULT_FACTORY_ABI,
      functionName: "getOwnerVaults",
      args: [owner as Address],
    })) as readonly `0x${string}`[];

    let hash: `0x${string}`;
    if (isNative) {
      hash = await walletClient.writeContract({
        address: VAULT_FACTORY_ADDRESS,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVaultNativeFor",
        args: [owner as Address, goalUnits, name],
      });
    } else {
      if (!assetAddress) {
        return NextResponse.json(
          { error: "Missing assetAddress for ERC20 vault" },
          { status: 400 }
        );
      }
      hash = await walletClient.writeContract({
        address: VAULT_FACTORY_ADDRESS,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVaultERC20For",
        args: [owner as Address, assetAddress as Address, goalUnits, name],
      });
    }

    await publicClient.waitForTransactionReceipt({ hash });

    // Poll for updated owner vaults and diff to find new address
    let newVaultAddress: `0x${string}` | null = null;
    try {
      const beforeSet = new Set(beforeVaults.map((v) => v.toLowerCase()));
      for (let i = 0; i < 6; i++) {
        const after = (await publicClient.readContract({
          address: VAULT_FACTORY_ADDRESS,
          abi: VAULT_FACTORY_ABI,
          functionName: "getOwnerVaults",
          args: [owner as Address],
        })) as readonly `0x${string}`[];
        const found = after.find(
          (a) => !beforeSet.has(String(a).toLowerCase())
        );
        if (found) {
          newVaultAddress = found as `0x${string}`;
          break;
        }
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch {
      /* ignore */
    }

    let user = await db.query.users.findFirst({
      where: eq(users.address, owner),
    });
    if (!user) {
      const inserted = await db
        .insert(users)
        .values({ address: owner, name: owner, provider: "wallet" as const })
        .onConflictDoNothing({ target: users.address })
        .returning();
      user =
        inserted[0] ??
        (await db.query.users.findFirst({ where: eq(users.address, owner) }));
    }

    if (user && newVaultAddress) {
      await db
        .insert(vaults)
        .values({ userId: user.id, address: newVaultAddress })
        .onConflictDoNothing();
    }

    return NextResponse.json(
      { ok: true, txHash: hash, vaultAddress: newVaultAddress },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/vaults/create] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

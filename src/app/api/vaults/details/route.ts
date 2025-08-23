import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createPublicClient, http } from "viem";
import type { Abi } from "viem";
import { db } from "@/db";
import { users, vaults } from "@/db/schema";
import { VAULT_ABI, ERC20_ABI } from "@/config/contracts";
import type { UiVault } from "@/lib/types";
import { monadTestnet } from "@reown/appkit/networks";

export const dynamic = "force-dynamic";

// Create a viem public client for server-side reads
const rpcUrl = (
  monadTestnet as unknown as { rpcUrls?: { default?: { http?: string[] } } }
).rpcUrls?.default?.http?.[0];
const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").trim().toLowerCase();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    // Find user by address
    const user = await db.query.users.findFirst({
      where: eq(users.address, address),
    });
    if (!user) {
      return NextResponse.json([] satisfies UiVault[]);
    }

    // Fetch vault rows for this user
    const rows = await db.query.vaults.findMany({
      where: eq(vaults.userId, user.id),
    });
    const vaultAddresses = rows.map((r) => r.address as `0x${string}`);
    if (vaultAddresses.length === 0) {
      return NextResponse.json([] satisfies UiVault[]);
    }

    // Build multicall contracts: goal, name, isNative, asset, assetBalance, creator
    const VAULT_ABI_TYPED = VAULT_ABI as Abi;
    const ERC20_ABI_TYPED = ERC20_ABI as Abi;

    const contracts: Array<{
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: unknown[];
    }> = [];
    for (const va of vaultAddresses) {
      contracts.push({
        address: va,
        abi: VAULT_ABI_TYPED,
        functionName: "goal",
      });
    }
    for (const va of vaultAddresses) {
      contracts.push({
        address: va,
        abi: VAULT_ABI_TYPED,
        functionName: "name",
      });
    }
    for (const va of vaultAddresses) {
      contracts.push({
        address: va,
        abi: VAULT_ABI_TYPED,
        functionName: "isNative",
      });
    }
    for (const va of vaultAddresses) {
      contracts.push({
        address: va,
        abi: VAULT_ABI_TYPED,
        functionName: "asset",
      });
    }
    for (const va of vaultAddresses) {
      contracts.push({
        address: va,
        abi: VAULT_ABI_TYPED,
        functionName: "assetBalance",
      });
    }
    for (const va of vaultAddresses) {
      contracts.push({
        address: va,
        abi: VAULT_ABI_TYPED,
        functionName: "creator",
      });
    }

    const result = await publicClient.multicall({
      // viem types are strict; this list is known-safe at runtime
      // use unknown[] here to avoid any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contracts: contracts as unknown[] as Parameters<
        typeof publicClient.multicall
      >[0]["contracts"],
      allowFailure: true,
    });
    const goalsStart = 0;
    const namesStart = goalsStart + vaultAddresses.length;
    const isNativeStart = namesStart + vaultAddresses.length;
    const assetsStart = isNativeStart + vaultAddresses.length;
    const balancesStart = assetsStart + vaultAddresses.length;
    const creatorsStart = balancesStart + vaultAddresses.length;

    // Derive asset addresses
    const assetAddresses: (`0x${string}` | undefined)[] = vaultAddresses.map(
      (_, i) => {
        const r = result[assetsStart + i];
        return (r?.result as `0x${string}` | undefined) ?? undefined;
      }
    );

    // Prepare ERC20 symbol/decimals multicalls for non-native assets
    const erc20Contracts: Array<{
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
    }> = [];
    assetAddresses.forEach((aa, i) => {
      const isNative = Boolean(
        (result[isNativeStart + i]?.result as boolean | undefined) ?? false
      );
      if (aa && !isNative) {
        erc20Contracts.push({
          address: aa,
          abi: ERC20_ABI_TYPED,
          functionName: "decimals",
        });
      }
    });
    assetAddresses.forEach((aa, i) => {
      const isNative = Boolean(
        (result[isNativeStart + i]?.result as boolean | undefined) ?? false
      );
      if (aa && !isNative) {
        erc20Contracts.push({
          address: aa,
          abi: ERC20_ABI_TYPED,
          functionName: "symbol",
        });
      }
    });
    const erc20Results = erc20Contracts.length
      ? await publicClient.multicall({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contracts: erc20Contracts as unknown[] as Parameters<
            typeof publicClient.multicall
          >[0]["contracts"],
          allowFailure: true,
        })
      : [];

    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 1000);
    const nowIso = now.toISOString();
    const prevIso = prev.toISOString();

    // Map results back to UiVault[]
    const uiVaults: UiVault[] = vaultAddresses.map((va, i) => {
      const goalRaw =
        (result[goalsStart + i]?.result as bigint | undefined) ?? BigInt(0);
      const name =
        (result[namesStart + i]?.result as string | undefined) ||
        `Vault ${va.slice(0, 6)}…${va.slice(-4)}`;
      const isNative = Boolean(
        (result[isNativeStart + i]?.result as boolean | undefined) ?? false
      );
      const asset = ((result[assetsStart + i]?.result as
        | `0x${string}`
        | undefined) ??
        ("0x0000000000000000000000000000000000000000" as `0x${string}`)) as `0x${string}`;
      const balRaw =
        (result[balancesStart + i]?.result as bigint | undefined) ?? BigInt(0);
      const creator =
        (result[creatorsStart + i]?.result as `0x${string}` | undefined) ??
        undefined;

      let decimals = 18;
      let symbol = "";
      if (isNative) {
        decimals = 18;
        symbol = "MON";
      } else {
        const dIdx = i * 2;
        const sIdx = i * 2 + 1;
        const dRes = erc20Results[dIdx]?.result as number | undefined;
        const sRes = erc20Results[sIdx]?.result as string | undefined;
        decimals = Number(dRes ?? 18);
        symbol = String(sRes ?? "");
      }

      const toUnits = (x: bigint, d: number) => Number(x) / 10 ** d;
      const balance = toUnits(balRaw, decimals);
      const goal = toUnits(goalRaw, decimals);

      return {
        id: va,
        name,
        symbol,
        assetAddress: asset,
        isNative,
        decimals,
        creator,
        isShared:
          Boolean(address) &&
          Boolean(creator) &&
          String(creator).toLowerCase() !== String(address).toLowerCase(),
        balanceUsd: balance,
        goalUsd: goal,
        history: [
          { timestamp: prevIso, valueUsd: Math.max(0, balance - 0.01) },
          { timestamp: nowIso, valueUsd: balance },
        ],
      } satisfies UiVault;
    });

    return NextResponse.json(uiVaults);
  } catch (err) {
    console.error("[GET /api/vaults/details] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

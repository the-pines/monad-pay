// todo hi ignacio these are all the hooks that we're using for the data
"use client";

import React from "react";
import {
  fetchCurrentUser,
  fetchUserBalanceUSD,
  fetchUserCard,
  fetchUserTransactions,
  fetchVirtualCardDisplay,
} from "@/lib/api";
import type {
  DbCard,
  DbUser,
  UiCardPublic,
  UiTransaction,
  UiVault,
} from "@/lib/types";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { VAULT_ABI, ERC20_ABI } from "@/config/contracts";
import { ERC20_TOKENS, TOKEN_USD_PRICE } from "@/config/tokens";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList
): AsyncState<T> {
  const [state, setState] = React.useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let mounted = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then(
        (data) => mounted && setState({ data, loading: false, error: null })
      )
      .catch(
        (error: Error) =>
          mounted && setState({ data: null, loading: false, error })
      );
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export function useCurrentUser() {
  return useAsync<DbUser>(fetchCurrentUser, []);
}

export function useUserBalanceUSD() {
  return useAsync<number>(fetchUserBalanceUSD, []);
}

export function useUserCard() {
  return useAsync<DbCard | undefined>(fetchUserCard, []);
}

export function useUserTransactions() {
  return useAsync<UiTransaction[]>(fetchUserTransactions, []);
}

export function useVirtualCardDisplay() {
  return useAsync<UiCardPublic>(fetchVirtualCardDisplay, []);
}

export function useVaults() {
  const { address } = useAccount();
  const enabled = Boolean(address);

  // Fetch vault addresses from our DB-backed API by user address
  const dbVaultAddresses = useAsync<`0x${string}`[]>(async () => {
    if (!address) return [];
    const res = await fetch(
      `/api/vaults?address=${encodeURIComponent(address)}`,
      {
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const arr = (await res.json()) as string[];
    return arr as `0x${string}`[];
  }, [address]);

  const vaultAddresses = React.useMemo(() => {
    const arr = (dbVaultAddresses.data as `0x${string}`[] | null) ?? [];
    // De-duplicate in case of accidental double inserts or API glitches
    return Array.from(
      new Set(arr.map((a) => a.toLowerCase()))
    ) as `0x${string}`[];
  }, [dbVaultAddresses.data]);

  const vaultMetaReads = useReadContracts({
    contracts: vaultAddresses.length
      ? [
          // goal
          ...vaultAddresses.map((va) => ({
            address: va,
            abi: VAULT_ABI,
            functionName: "goal" as const,
          })),
          // name
          ...vaultAddresses.map((va) => ({
            address: va,
            abi: VAULT_ABI,
            functionName: "name" as const,
          })),
          // isNative
          ...vaultAddresses.map((va) => ({
            address: va,
            abi: VAULT_ABI,
            functionName: "isNative" as const,
          })),
          // asset address
          ...vaultAddresses.map((va) => ({
            address: va,
            abi: VAULT_ABI,
            functionName: "asset" as const,
          })),
          // current asset balance in vault
          ...vaultAddresses.map((va) => ({
            address: va,
            abi: VAULT_ABI,
            functionName: "assetBalance" as const,
          })),
          // creator (owner)
          ...vaultAddresses.map((va) => ({
            address: va,
            abi: VAULT_ABI,
            functionName: "creator" as const,
          })),
        ]
      : [],
    query: { enabled: enabled && vaultAddresses.length > 0 },
    allowFailure: true,
  });

  // Derive asset addresses to fetch decimals
  const assetAddresses: (`0x${string}` | undefined)[] = React.useMemo(() => {
    const results = vaultMetaReads.data ?? [];
    if (!results.length || vaultAddresses.length === 0) return [];
    const offsetAsset = vaultAddresses.length * 3; // after goals, names, isNative
    return vaultAddresses.map((_, i) => {
      const r = results[offsetAsset + i];
      return (r?.result as `0x${string}` | undefined) ?? undefined;
    });
  }, [vaultMetaReads.data, vaultAddresses]);

  const decimalsReads = useReadContracts({
    contracts: assetAddresses.length
      ? assetAddresses.map((aa) => ({
          address: aa as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals" as const,
        }))
      : [],
    query: { enabled: enabled && assetAddresses.length > 0 },
    allowFailure: true,
  });

  const symbolReads = useReadContracts({
    contracts: assetAddresses.length
      ? assetAddresses.map((aa) => ({
          address: aa as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol" as const,
        }))
      : [],
    query: { enabled: enabled && assetAddresses.length > 0 },
    allowFailure: true,
  });

  const loading =
    dbVaultAddresses.loading ||
    vaultMetaReads.isLoading ||
    decimalsReads.isLoading;

  const data: UiVault[] = React.useMemo(() => {
    if (!vaultAddresses.length) return [];
    const meta = vaultMetaReads.data ?? [];
    const decs = decimalsReads.data ?? [];
    const syms = symbolReads.data ?? [];
    const goalsStart = 0;
    const namesStart = vaultAddresses.length;
    const isNativeStart = namesStart + vaultAddresses.length;
    const assetsStart = isNativeStart + vaultAddresses.length;
    const balancesStart = assetsStart + vaultAddresses.length;
    const creatorsStart = balancesStart + vaultAddresses.length;

    // Produce consistent timestamps across all vaults for aggregation
    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 1000); // 1 minute earlier
    const nowIso = now.toISOString();
    const prevIso = prev.toISOString();

    return vaultAddresses.map((va, i) => {
      const goalRaw =
        (meta[goalsStart + i]?.result as bigint | undefined) ?? BigInt(0);
      const name =
        (meta[namesStart + i]?.result as string | undefined) ||
        `Vault ${va.slice(0, 6)}…${va.slice(-4)}`;
      const isNative = Boolean(
        (meta[isNativeStart + i]?.result as boolean | undefined) ?? false
      );
      const balRaw =
        (meta[balancesStart + i]?.result as bigint | undefined) ?? BigInt(0);
      let decimals = 18;
      let symbol = "";
      if (isNative) {
        decimals = 18;
        symbol = "MON";
      } else {
        decimals = Number((decs[i]?.result as number | undefined) ?? 18);
        symbol = String((syms[i]?.result as string | undefined) ?? "");
      }

      const toUnits = (x: bigint, d: number) => Number(x) / 10 ** d;
      const balance = toUnits(balRaw, decimals);
      const goal = toUnits(goalRaw, decimals);

      return {
        id: va,
        name,
        symbol,
        assetAddress:
          (meta[assetsStart + i]?.result as `0x${string}` | undefined) ??
          ("0x0000000000000000000000000000000000000000" as `0x${string}`),
        isNative,
        decimals,
        creator:
          (meta[creatorsStart + i]?.result as `0x${string}` | undefined) ??
          undefined,
        isShared:
          Boolean(address) &&
          Boolean(meta[creatorsStart + i]?.result as string | undefined) &&
          String(meta[creatorsStart + i]?.result as string).toLowerCase() !==
            String(address).toLowerCase(),
        balanceUsd: balance,
        goalUsd: goal,
        changeUsd: 0,
        changePct: 0,
        history: [
          { timestamp: prevIso, valueUsd: Math.max(0, balance - 0.01) },
          { timestamp: nowIso, valueUsd: balance },
        ],
      } as UiVault;
    });
  }, [
    vaultAddresses,
    vaultMetaReads.data,
    decimalsReads.data,
    symbolReads.data,
    address,
  ]);

  return React.useMemo(
    () => ({ data, loading, error: null as Error | null }),
    [data, loading]
  );
}

export type UiTokenHolding = {
  symbol: string;
  name: string;
  decimals: number;
  amount: number; // token units
  amountUsd: number; // converted using TOKEN_USD_PRICE
};

export function usePortfolio() {
  const { address } = useAccount();
  const enabled = Boolean(address);

  const native = useBalance({ address, query: { enabled } });

  const erc20Balances = useReadContracts({
    contracts: ERC20_TOKENS.map((t) => ({
      address: t.address,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: [address as `0x${string}`],
    })),
    query: { enabled },
    allowFailure: true,
  });

  const loading = native.isLoading || erc20Balances.isLoading;

  const data: UiTokenHolding[] = React.useMemo(() => {
    if (!address) return [];
    const holdings: UiTokenHolding[] = [];

    const monAmount = Number(native.data?.value ?? BigInt(0)) / 1e18;
    if (monAmount > 0) {
      const price = TOKEN_USD_PRICE["MON"] ?? 0;
      holdings.push({
        symbol: "MON",
        name: "Monad",
        decimals: 18,
        amount: monAmount,
        amountUsd: monAmount * price,
      });
    }

    const balances = erc20Balances.data ?? [];
    ERC20_TOKENS.forEach((t, idx) => {
      const balRaw = (balances[idx]?.result as bigint | undefined) ?? BigInt(0);
      const amount = Number(balRaw) / 10 ** t.decimals;
      if (amount > 0) {
        const price = TOKEN_USD_PRICE[t.symbol] ?? 0;
        holdings.push({
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          amount,
          amountUsd: amount * price,
        });
      }
    });

    return holdings;
  }, [address, native.data?.value, erc20Balances.data]);

  const totalUsd = React.useMemo(
    () => data.reduce((sum, h) => sum + h.amountUsd, 0),
    [data]
  );

  return React.useMemo(
    () => ({ data, totalUsd, loading, error: null as Error | null }),
    [data, totalUsd, loading]
  );
}

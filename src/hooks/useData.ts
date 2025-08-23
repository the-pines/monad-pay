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
import { ERC20_ABI } from "@/config/contracts";
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

  const state = useAsync<UiVault[]>(async () => {
    if (!address) return [];
    const res = await fetch(
      `/api/vaults/details?address=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const arr = (await res.json()) as UiVault[];
    // De-duplicate by id guard
    const seen = new Set<string>();
    return arr.filter((v) => {
      const key = v.id.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [address]);

  return React.useMemo(
    () => ({
      data: state.data ?? [],
      loading: state.loading,
      error: state.error,
    }),
    [state.data, state.loading, state.error]
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

"use client";

import React from "react";
import { fetchUserTransactions } from "@/lib/api";
import type { UiTransaction, UiVault } from "@/lib/types";
import { useAccount, usePublicClient } from "wagmi";

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

export function useUserTransactions(limit?: number, fromBlock?: number) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const baseState = useAsync<UiTransaction[]>(
    () => fetchUserTransactions(address, { limit, fromBlock }),
    [address, limit, fromBlock]
  );
  const [overrideData, setOverrideData] = React.useState<
    UiTransaction[] | null
  >(null);

  React.useEffect(() => {
    setOverrideData(null);
  }, [address, limit, fromBlock]);

  React.useEffect(() => {
    if (!publicClient || !address) return;
    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber: async () => {
        try {
          const freshData = await fetchUserTransactions(address, {
            limit,
            fromBlock,
            fresh: true,
          });
          const prev = overrideData ?? baseState.data ?? [];
          const changed =
            prev.length !== freshData.length ||
            prev[0]?.id !== freshData[0]?.id;
          if (changed) setOverrideData(freshData);
        } catch {
          // ignore
        }
      },
      emitOnBegin: false,
      poll: true,
    });
    return () => {
      unwatch?.();
    };
  }, [publicClient, address, limit, fromBlock, baseState.data, overrideData]);

  return React.useMemo(
    () => ({
      data: (overrideData ?? baseState.data) as UiTransaction[] | null,
      loading: baseState.loading,
      error: baseState.error,
    }),
    [baseState.data, baseState.loading, baseState.error, overrideData]
  );
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

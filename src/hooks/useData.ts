// todo hi ignacio these are all the hooks that we're using for the data
'use client';

import React from 'react';
import { fetchUserTransactions } from '@/lib/api';
import type { UiTransaction, UiVault } from '@/lib/types';
import { useAccount } from 'wagmi';

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

export function useUserTransactions() {
  const { address } = useAccount();
  return useAsync<UiTransaction[]>(
    () => fetchUserTransactions(address),
    [address]
  );
}

export function useVaults() {
  const { address } = useAccount();

  const state = useAsync<UiVault[]>(async () => {
    if (!address) return [];
    const res = await fetch(
      `/api/vaults/details?address=${encodeURIComponent(address)}`,
      { cache: 'no-store' }
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

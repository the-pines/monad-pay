// todo hi ignacio these are all the hooks that we're using for the data
"use client";

import React from "react";
import {
  fetchCurrentUser,
  fetchUserBalanceUSD,
  fetchUserCard,
  fetchUserTransactions,
  fetchVirtualCardDisplay,
  fetchVaults,
} from "@/lib/api";
import type {
  DbCard,
  DbUser,
  UiCardPublic,
  UiTransaction,
  UiVault,
} from "@/lib/types";

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
  return useAsync<UiVault[]>(fetchVaults, []);
}

import type { DbCard, DbUser, UiCardPublic, UiTransaction } from "./types";
import { dataSource } from "./datasource";

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchCurrentUser(): Promise<DbUser> {
  return delay(await dataSource.getCurrentUser());
}

export async function fetchUserBalanceUSD(): Promise<number> {
  return delay(await dataSource.getUserBalanceUSD());
}

export async function fetchUserCard(): Promise<DbCard | undefined> {
  return delay(await dataSource.getUserCard());
}

export async function fetchUserTransactions(
  address?: string,
  opts?: { limit?: number; fromBlock?: number }
): Promise<UiTransaction[]> {
  if (!address) return [];
  try {
    const params = new URLSearchParams({ address });
    if (opts?.limit && Number.isFinite(opts.limit)) {
      params.set("limit", String(opts.limit));
    }
    if (opts?.fromBlock && Number.isFinite(opts.fromBlock)) {
      params.set("fromBlock", String(opts.fromBlock));
    }
    const res = await fetch(`/api/transactions?${params.toString()}`, {
      cache: "force-cache",
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const arr = (await res.json()) as UiTransaction[];
    return arr;
  } catch {
    return [];
  }
}

export async function fetchVirtualCardDisplay(): Promise<UiCardPublic> {
  return delay(await dataSource.getVirtualCardPublic());
}

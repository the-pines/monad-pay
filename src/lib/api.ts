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
  address?: string
): Promise<UiTransaction[]> {
  if (!address) return [];
  try {
    const res = await fetch(
      `/api/transactions?address=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    );
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

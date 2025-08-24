import type { UiTransaction } from './types';

export async function fetchUserTransactions(
  address?: string
): Promise<UiTransaction[]> {
  if (!address) return [];
  try {
    const res = await fetch(
      `/api/transactions?address=${encodeURIComponent(address)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const arr = (await res.json()) as UiTransaction[];
    return arr;
  } catch {
    return [];
  }
}

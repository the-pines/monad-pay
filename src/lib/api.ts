import type { UiTransaction } from "./types";

export async function fetchUserTransactions(
  address?: string,
  opts?: { limit?: number; fromBlock?: number; fresh?: boolean }
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
    if (opts?.fresh) params.set("fresh", "1");
    const res = await fetch(
      `/api/transactions?${params.toString()}` +
        (opts?.fresh ? `&ts=${Date.now()}` : ""),
      {
        cache: "no-store",
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return [];
    const arr = (await res.json()) as UiTransaction[];
    return arr;
  } catch {
    return [];
  }
}

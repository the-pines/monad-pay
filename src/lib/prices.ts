import { TOKEN_USD_PRICE } from "@/config/tokens";

type CacheEntry = { value: number; ts: number };
const CACHE_TTL_MS = 60_000; // 60s
const priceCache = new Map<string, CacheEntry>(); // key: symbol

function now(): number {
  return Date.now();
}

export async function getUsdPriceForSymbol(
  symbol: string
): Promise<number | null> {
  const key = symbol.toUpperCase();
  const hit = priceCache.get(key);
  if (hit && now() - hit.ts < CACHE_TTL_MS) return hit.value;

  const direct = TOKEN_USD_PRICE[key];
  if (Number.isFinite(direct)) {
    priceCache.set(key, { value: direct, ts: now() });
    return direct;
  }

  return null;
}

export async function getUsdPricesForSymbols(
  symbols: string[]
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const s of symbols) {
    const key = s.toUpperCase();
    const p = TOKEN_USD_PRICE[key];
    if (Number.isFinite(p)) out[key] = p;
  }
  return out;
}

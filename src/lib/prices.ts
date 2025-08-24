import { ERC20_TOKENS } from "@/config/tokens";

const ZEROEX_API_BASE_URL = "https://api.0x.org";
const ZEROX_API_KEY = process.env.ZEROX_API_KEY; // optional
const PRICE_CHAIN_ID =
  process.env.ZEROX_CHAIN_ID || process.env.PRICE_CHAIN_ID || "1";

// 0x placeholder for native token in price endpoints
const NATIVE_TOKEN_PLACEHOLDER = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

type PriceResp = { buyAmount?: string; sellAmount?: string };

type CacheEntry = { value: number; ts: number };
const CACHE_TTL_MS = 60_000; // 60s
const priceCache = new Map<string, CacheEntry>(); // key: symbol

function now(): number {
  return Date.now();
}

function getTokenMetaBySymbol(symbol: string) {
  if (symbol.toUpperCase() === "MON" || symbol.toUpperCase() === "WMON") {
    return {
      symbol: symbol.toUpperCase(),
      address: NATIVE_TOKEN_PLACEHOLDER as `0x${string}`,
      decimals: 18,
      isNative: true,
    };
  }
  const token = ERC20_TOKENS.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token) return null;
  return {
    symbol: token.symbol,
    address: token.address,
    decimals: token.decimals,
    isNative: false,
  };
}

function getUsdcMeta() {
  const usdc = ERC20_TOKENS.find((t) => t.symbol.toUpperCase() === "USDC");
  if (!usdc) return null;
  return usdc;
}

async function fetchIndicativeBuyAmount({
  sellToken,
  buyToken,
  sellAmount,
  taker,
}: {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker?: string;
}): Promise<bigint | null> {
  try {
    const headers: Record<string, string> = { "0x-version": "v2" };
    if (ZEROX_API_KEY) headers["0x-api-key"] = ZEROX_API_KEY;
    const params = new URLSearchParams({
      chainId: String(PRICE_CHAIN_ID),
      sellToken,
      buyToken,
      sellAmount,
    });
    if (taker) params.set("taker", taker);
    const url = `${ZEROEX_API_BASE_URL.replace(
      /\/$/,
      ""
    )}/swap/permit2/price?${params.toString()}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as PriceResp;
    const buyAmount = body?.buyAmount ? BigInt(body.buyAmount) : null;
    return buyAmount ?? null;
  } catch {
    return null;
  }
}

export async function getUsdPriceForSymbol(
  symbol: string
): Promise<number | null> {
  const key = symbol.toUpperCase();
  const hit = priceCache.get(key);
  if (hit && now() - hit.ts < CACHE_TTL_MS) return hit.value;

  const usdc = getUsdcMeta();
  const meta = getTokenMetaBySymbol(key);
  if (!usdc || !meta) return null;

  if (key === "USDC") {
    priceCache.set(key, { value: 1, ts: now() });
    return 1;
  }

  const oneToken = BigInt(10) ** BigInt(meta.decimals);
  const buyAmount = await fetchIndicativeBuyAmount({
    sellToken: meta.address,
    buyToken: usdc.address,
    sellAmount: oneToken.toString(),
  });

  if (!buyAmount) return null;
  const price = Number(buyAmount) / 10 ** usdc.decimals;
  if (!Number.isFinite(price)) return null;
  priceCache.set(key, { value: price, ts: now() });
  return price;
}

export async function getUsdPricesForSymbols(
  symbols: string[]
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    symbols.map(async (s) => {
      const p = await getUsdPriceForSymbol(s);
      return [s.toUpperCase(), p] as const;
    })
  );
  const out: Record<string, number> = {};
  for (const [sym, p] of entries) {
    if (p !== null && Number.isFinite(p)) out[sym] = p;
  }
  return out;
}

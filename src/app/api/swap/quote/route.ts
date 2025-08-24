import { NextRequest, NextResponse } from "next/server";

const ZEROEX_API_BASE_URL = "https://api.0x.org";
const ZEROX_API_KEY = process.env.ZEROX_API_KEY;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const chainId = url.searchParams.get("chainId") || "1";
    const sellToken = url.searchParams.get("sellToken");
    const buyToken = url.searchParams.get("buyToken");
    const sellAmount = url.searchParams.get("sellAmount");
    const taker = url.searchParams.get("taker") || undefined;
    const slippagePercentage =
      url.searchParams.get("slippagePercentage") || "0.01";

    if (!sellToken || !buyToken || !sellAmount) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const headers: Record<string, string> = { "0x-version": "v2" };
    if (ZEROX_API_KEY) headers["0x-api-key"] = ZEROX_API_KEY;

    const params = new URLSearchParams({
      chainId,
      sellToken,
      buyToken,
      sellAmount,
      slippagePercentage,
    });
    if (taker) params.set("taker", taker);

    const res = await fetch(
      `${ZEROEX_API_BASE_URL.replace(
        /\/$/,
        ""
      )}/swap/permit2/quote?${params.toString()}`,
      { headers, cache: "no-store" }
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "Quote failed" }, { status: 500 });
  }
}

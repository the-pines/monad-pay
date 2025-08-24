import { NextRequest, NextResponse } from "next/server";
import { getUsdPricesForSymbols } from "@/lib/prices";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbolsParam = url.searchParams.get("symbols") || "";
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (symbols.length === 0) return NextResponse.json({}, { status: 200 });

    const prices = await getUsdPricesForSymbols(symbols);
    return NextResponse.json(prices, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}

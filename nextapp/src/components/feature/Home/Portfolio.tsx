"use client";

import React from "react";
import { usePortfolio } from "@/hooks";
import { Card } from "@/components/ui";

export default function Portfolio() {
  const { data, loading } = usePortfolio();

  if (loading && (!data || data.length === 0)) {
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const format = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 6 });

  const tokenEmoji: Record<string, string> = {
    MON: "🟣",
    USDC: "💵",
    WETH: "💎",
    WBTC: "🟠",
  };

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-sm leading-6 font-medium tracking-wide text-[--foreground]/70">
        Portfolio
      </h2>
      <div className="space-y-2">
        {data.map((t) => (
          <Card
            key={`${t.symbol}-${t.decimals}`}
            className="w-full px-3 py-3 flex items-center"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl leading-none">
                {tokenEmoji[t.symbol] ?? "🪙"}
              </span>
              <span className="amount font-bold text-[16px] leading-5 text-[--foreground] tabular-nums">
                {format(t.amount)} {t.symbol}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { usePortfolio } from "@/hooks";

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
  const formatUsd = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-sm leading-6 font-medium tracking-wide text-[--foreground]/70">
        Portfolio
      </h2>
      <div className="space-y-3">
        {data.map((t) => (
          <div
            key={`${t.symbol}-${t.decimals}`}
            className="w-full text-left rounded-3xl bg-white/5 px-4 py-3 flex items-center justify-between soft-shadow"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-[14px] leading-5 text-[--foreground]/80">
                {t.symbol}
              </div>
              <div className="mt-0.5 text-xs text-[--foreground]/60">
                {t.name}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[16px] leading-5 text-[--foreground]">
                {format(t.amount)} {t.symbol}
              </div>
              <div className="mt-0.5 text-xs text-[--foreground]/60">
                ${formatUsd(t.amountUsd)} USD
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

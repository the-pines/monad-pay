'use client';

import React from 'react';

import { Card } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';

export default function Portfolio() {
  const { portfolio, isFetchingPortfolio } = useUser();

  const format = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 6 });

  const tokenEmoji: Record<string, string> = {
    MON: '🟣',
    USDC: '💵',
    WETH: '💎',
    WBTC: '🟠',
  };

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-sm leading-6 font-medium tracking-wide text-[--foreground]/70">
        Portfolio
      </h2>
      <div className="space-y-2">
        {isFetchingPortfolio && portfolio.length === 0
          ? Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="w-full h-[52px] rounded-3xl bg-[var(--card-surface)] border border-[var(--card-border)] soft-shadow animate-pulse"
                style={{ animationDelay: `${idx * 60}ms` }}
              />
            ))
          : portfolio.map((t) => (
              <Card
                key={`${t.symbol}-${t.decimals}`}
                className="w-full px-3 py-3 flex items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">
                    {tokenEmoji[t.symbol] ?? '🪙'}
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

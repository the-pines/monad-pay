"use client";

import React from "react";

import { Card } from "@/components/ui";
import { useUser } from "@/contexts/UserContext";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits } from "viem";

export default function Portfolio() {
  const { portfolio, isFetchingPortfolio, refreshPortfolio } = useUser();
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [showSwap, setShowSwap] = React.useState(false);
  const [swapAnimIn, setSwapAnimIn] = React.useState(false);
  const monBalance = React.useMemo(() => {
    const mon = portfolio.find((t) => t.symbol === "MON");
    return mon?.amount ?? 0;
  }, [portfolio]);

  const handleSwapAllButGas = async () => {
    try {
      if (!address || !publicClient || !walletClient) return;
      const chainId = chain?.id ?? 1;

      const amountToKeep = 0.02; // leave for gas
      const sellAmountMon = Math.max(0, monBalance - amountToKeep);
      if (sellAmountMon <= 0) return;

      const sellAmountWei = parseUnits(String(sellAmountMon), 18);

      const params = new URLSearchParams({
        chainId: String(chainId),
        sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // MON as native
        buyToken: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", // WMON address from config
        sellAmount: sellAmountWei.toString(),
        taker: address,
        slippagePercentage: "0.01",
      });

      const res = await fetch(`/api/swap/quote?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to get quote");
      const quote = await res.json();

      const to = (quote?.transaction?.to ?? quote?.to) as `0x${string}`;
      const data = (quote?.transaction?.data ?? quote?.data) as `0x${string}`;
      const gas = quote?.transaction?.gas
        ? BigInt(quote.transaction.gas)
        : undefined;
      const value = quote?.transaction?.value
        ? BigInt(quote.transaction.value)
        : undefined;

      await walletClient.sendTransaction({
        account: walletClient.account!,
        to,
        data,
        gas,
        value,
        chain,
      });

      setShowSwap(false);
      // Recompute portfolio and overall balance immediately after swap
      await refreshPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  const format = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 6 });

  const tokenEmoji: Record<string, string> = {
    MON: "🟣",
    USDC: "💵",
    WETH: "💎",
    WBTC: "🟠",
  };

  return (
    <div className='mt-6'>
      <h2 className='mb-4 text-sm leading-6 font-medium tracking-wide text-[--foreground]/70'>
        Portfolio
      </h2>
      <div className='space-y-2'>
        {isFetchingPortfolio && portfolio.length === 0
          ? Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className='w-full h-[52px] rounded-3xl bg-[var(--card-surface)] border border-[var(--card-border)] soft-shadow animate-pulse'
                style={{ animationDelay: `${idx * 60}ms` }}
              />
            ))
          : portfolio.map((t) => (
              <Card
                key={`${t.symbol}-${t.decimals}`}
                className='w-full px-3 py-3 flex items-center'
              >
                <div className='flex items-center gap-3 flex-1'>
                  <span className='text-xl leading-none'>
                    {tokenEmoji[t.symbol] ?? "🪙"}
                  </span>
                  <span className='amount font-bold text-[16px] leading-5 text-[--foreground] tabular-nums'>
                    {format(t.amount)} {t.symbol}
                  </span>
                </div>
                {t.symbol === "MON" && t.amount > 0.02 ? (
                  <button
                    type='button'
                    className='ml-3 inline-flex items-center justify-center px-3 py-1.5 rounded-2xl bg-blue-400/25 text-blue-300 hover:bg-blue-400/30 font-medium'
                    title='Swap MON to WMON for card spend'
                    onClick={() => {
                      setShowSwap(true);
                      setTimeout(() => setSwapAnimIn(true), 10);
                    }}
                  >
                    Swap
                  </button>
                ) : null}
              </Card>
            ))}
      </div>

      {showSwap ? (
        <div
          className={
            "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 " +
            (swapAnimIn ? "opacity-100" : "opacity-0")
          }
        >
          <div
            className={
              "rounded-2xl bg-[#2a1b68] border border-[var(--card-border)] p-5 w-[min(92vw,420px)] soft-shadow transform transition-all duration-200 ease-out " +
              (swapAnimIn
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-2")
            }
          >
            <div className='text-lg font-semibold text-[--foreground]'>
              Swap MON to WMON
            </div>
            <div className='mt-2 text-[--foreground]/80 text-sm'>
              The card cannot spend MON, please swap to WMON.
            </div>
            <div className='mt-5 flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setSwapAnimIn(false);
                  setTimeout(() => setShowSwap(false), 220);
                }}
                className='px-3 py-2 rounded-lg bg-[var(--card-surface)] border border-[var(--card-border)] text-[--foreground]/80 hover:bg-[var(--card-surface-hover)]'
              >
                Cancel
              </button>
              {monBalance > 0.02 ? (
                <button
                  type='button'
                  onClick={handleSwapAllButGas}
                  className='px-3 py-2 rounded-lg border border-[#1DE9B6]/30 bg-[#1DE9B6]/20 text-[#1DE9B6] hover:bg-[#1DE9B6]/25'
                >
                  Swap
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

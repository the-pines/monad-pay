"use client";

import React from "react";
import type { UiVault } from "@/lib/types";
import { formatToken } from "@/lib/format";
import ProgressCircle from "./ProgressCircle";

type VaultCardProps = {
  vault: UiVault;
  onSelect?: (vault: UiVault) => void;
};

const VaultCard: React.FC<VaultCardProps> = ({ vault, onSelect }) => {
  const progress = Math.max(
    0,
    Math.min(1, vault.balanceUsd / Math.max(1, vault.goalUsd))
  );

  return (
    <button
      type='button'
      onClick={() => onSelect?.(vault)}
      className='group h-[167px] rounded-3xl bg-[var(--card-surface)] border border-[var(--card-border)] interactive-gradient
                 hover:bg-[var(--card-surface-hover)] transition-colors soft-shadow
                 focus:outline-none focus:ring-2 focus:ring-[#8A76F9]/60
                 p-4 w-full text-left'
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='text-[18px]' aria-hidden>
            {pickEmojiForVault(vault.name)}
          </span>
          <span className='font-semibold text-[15px] text-foreground truncate'>
            {vault.name}
          </span>
        </div>

        {vault.isShared ? (
          <span className='ml-2 shrink-0 rounded-full bg-white/10 text-white/70 px-2 py-0.5 text-[10px] font-medium'>
            SHARED
          </span>
        ) : null}
      </div>

      <div className='mt-1 text-[12.5px] text-white/65 truncate'>
        Goal: {formatToken(vault.goalUsd, vault.symbol)}
      </div>

      <div className='mt-4 flex items-center justify-between'>
        <div className='display-text text-sm font-semibold bg-gradient-to-r from-[#8A76F9] to-[#b7a5ff] bg-clip-text text-transparent tabular-nums'>
          {formatToken(vault.balanceUsd, vault.symbol)}
        </div>
        <ProgressCircle
          value={progress}
          size={44}
          thickness={6}
          className='[--pc-start:#8A76F9] [--pc-end:#B7A5FF]'
          showPercent={false}
        />
      </div>
    </button>
  );
};

function pickEmojiForVault(name: string): string {
  const lower = name.toLowerCase();
  if (/(home|house|rent|mortgage)/.test(lower)) return "🏠";
  if (/(car|auto|vehicle|bike)/.test(lower)) return "🚗";
  if (/(trip|travel|vacation|holiday)/.test(lower)) return "✈️";
  if (/(wedding|ring|marry)/.test(lower)) return "💍";
  if (/(education|college|school)/.test(lower)) return "🎓";
  if (/(tech|laptop|phone|pc)/.test(lower)) return "💻";
  if (/(pet|dog|cat)/.test(lower)) return "🐶";
  if (/(health|gym|fitness)/.test(lower)) return "💪";
  if (/(emergency|rainy|buffer)/.test(lower)) return "☔️";
  if (/(party|fun|gift|present)/.test(lower)) return "🎉";
  const pool = ["🌟", "🌈", "🔥", "🪙", "🚀", "🌊", "🍀", "🧭", "🧠", "⭐️"];
  let hash = 0;
  for (let i = 0; i < lower.length; i++)
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

export default VaultCard;

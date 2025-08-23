"use client";

import React from "react";
import type { UiVault } from "@/lib/types";

type VaultCardProps = {
  vault: UiVault;
  onSelect?: (vault: UiVault) => void;
};

function formatToken(amount: number, symbol?: string): string {
  const s = symbol || "";
  const abs = Math.abs(amount);
  const maximumFractionDigits = abs < 1 ? 3 : abs < 10 ? 2 : 0;
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits,
  })} ${s}`.trim();
}

// Removed sparkline utilities

// Removed sparkline graph per new design

const VaultCard: React.FC<VaultCardProps> = ({ vault, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(vault)}
      className="flex flex-col justify-center items-start p-4 gap-2 w-[174.5px] h-[167px] rounded-2xl bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)] transition-colors"
    >
      <div className="flex flex-col items-start gap-1 w-[142.5px]">
        <div className="flex flex-row items-center  w-full">
          <span className="font-bold text-[17px] leading-[22px] text-foreground truncate">
            {vault.name}
          </span>
        </div>
        <div className="flex flex-row items-center w-full">
          <span className="text-[15px] text-white/50 ">
            {`Goal: ${formatToken(vault.goalUsd, vault.symbol)}`}
          </span>
        </div>
      </div>
      <div className="w-[142.5px] h-[56px]" />
      <div
        className="text-[13px] font-bold leading-[17px] ml-auto"
        style={{ color: "#8A76F9" }}
      >
        {formatToken(vault.balanceUsd, vault.symbol)}
      </div>
    </button>
  );
};

export default VaultCard;

"use client";

import React from "react";
import type { UiVault } from "@/lib/types";

type VaultCardProps = {
  vault: UiVault;
  onSelect?: (vault: UiVault) => void;
};

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function buildSparkPath(
  values: number[],
  width: number,
  height: number
): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * height;
    return `${x},${y}`;
  });
  return points.join(" ");
}

const Sparkline: React.FC<{
  history: UiVault["history"];
  className?: string;
}> = ({ history, className }) => {
  const width = 142.5;
  const height = 56;
  const values = history.map((h) => h.valueUsd);
  const d = buildSparkPath(values, width, height);
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <polyline fill="none" stroke="#8A76F9" strokeWidth={3} points={d} />
    </svg>
  );
};

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
            {`Goal: ${formatUsd(vault.goalUsd)}`}
          </span>
        </div>
      </div>
      <Sparkline history={vault.history} className="w-[142.5px] h-[56px]" />
      <div
        className="text-[13px] font-bold leading-[17px] ml-auto"
        style={{ color: "#8A76F9" }}
      >
        {formatUsd(vault.balanceUsd)}
      </div>
    </button>
  );
};

export default VaultCard;

"use client";

import React from "react";
import type { UiVault } from "@/lib/types";

type VaultGraphProps = {
  vault: UiVault;
};

function buildPath(values: number[], width: number, height: number): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
  return path;
}

const VaultGraph: React.FC<VaultGraphProps> = ({ vault }) => {
  const width = 393;
  const height = 216;
  const values = vault.history.map((h) => h.valueUsd);
  const d = buildPath(values, width, height);
  return (
    <div className="flex flex-col items-center pt-4 w-[393px] h-[232px] bg-[#200052]">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={`Performance of ${vault.name}`}
      >
        <path d={d} fill="none" stroke="#836EF9" strokeWidth={4} />
      </svg>
    </div>
  );
};

export default VaultGraph;

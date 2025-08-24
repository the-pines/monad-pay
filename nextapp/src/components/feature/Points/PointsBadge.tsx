"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { POINTS_TOKEN_ABI, POINTS_TOKEN_ADDRESS } from "@/config/contracts";
import { Button } from "@/components/ui";

type PointsBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function PointsBadge({
  className,
  size = "md",
}: PointsBadgeProps) {
  const { address } = useAccount();
  const enabled = Boolean(address && POINTS_TOKEN_ADDRESS);

  const { data, isLoading } = useReadContract({
    address: POINTS_TOKEN_ADDRESS as `0x${string}`,
    abi: POINTS_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled },
  });

  const balance = Number((data as bigint | undefined) ?? BigInt(0));

  return (
    <Button
      size={size}
      className={`animated-gradient text-black/90 ${className ?? ""}`}
    >
      {isLoading ? "…" : `${balance.toLocaleString()} Points ✨`}
    </Button>
  );
}

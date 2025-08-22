"use client";

import React from "react";
import VirtualCard from "@/components/feature/Home/VirtualCard";
import RecentTransactions from "@/components/feature/Home/RecentTransactions";
import RedeemPointsNearby from "./RedeemPointsNearby";
import { useUserBalanceUSD, useVirtualCardDisplay } from "@/hooks";

export default function Home() {
  const { data: balanceUsd } = useUserBalanceUSD();
  const { data: card } = useVirtualCardDisplay();
  return (
    <section className="relative p-4">
      <div className="text-[#FBFAF9] font-extrabold text-[34px] leading-[41px] tracking-[-0.02em]">
        {typeof balanceUsd === "number"
          ? `$${balanceUsd.toLocaleString()}`
          : "$0"}
      </div>

      <div className="mt-6 flex justify-center">
        <VirtualCard
          cardholderName={card?.cardholderName ?? ""}
          cardNumber={card?.cardNumber ?? ""}
          expiry={card?.expiry ?? ""}
          cvv={card?.cvv ?? ""}
        />
      </div>

      <RecentTransactions />
      <RedeemPointsNearby />
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { useVaults } from "@/hooks";
import type { UiVault } from "@/lib/types";
import VaultCard from "@/components/ui/Vault";
import VaultGraph from "./VaultGraph";
import { PlusCircleIcon } from "@heroicons/react/24/outline";

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className="flex flex-col items-start w-full bg-[#200052] p-4">
    <h1 className="text-xl font-semibold text-[#FBFAF9]">{title}</h1>
    {subtitle ? (
      <div className="mt-4">
        <span className="text-[18px] font-bold leading-[23px] text-[#836EF9]">
          {subtitle}
        </span>
      </div>
    ) : null}
  </div>
);

const Vaults: React.FC<{
  vaults: UiVault[];
  onSelect: (v: UiVault) => void;
}> = ({ vaults, onSelect }) => {
  return (
    <div className="w-full bg-[#200052] pb-4">
      <div className="flex items-center px-4 pt-6">
        <div className="text-[18px] font-bold leading-[23px] text-[#FBFAF9]">
          All vaults
        </div>
      </div>

      <div className="flex flex-row flex-wrap gap-3 px-4 pt-1">
        {vaults.map((v) => (
          <VaultCard key={v.id} vault={v} onSelect={onSelect} />
        ))}

        <Link
          href="/vaults/new"
          className="relative w-[175px] h-[167px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-center justify-center gap-2 text-center hover:bg-[rgba(251,250,249,0.1)] cursor-pointer"
          aria-label="Create new vault"
        >
          <PlusCircleIcon
            className="w-8 h-8 text-[#836EF9]"
            aria-hidden="true"
          />
          <span className="font-bold text-[17px] text-[#FBFAF9]">Add new</span>
        </Link>
      </div>
    </div>
  );
};

const VaultsPage: React.FC = () => {
  const { data, loading } = useVaults();
  const vaults: UiVault[] = React.useMemo(() => data ?? [], [data]);
  const aggregateVault = React.useMemo<UiVault | null>(() => {
    if (!vaults.length) return null;
    const totalsByTimestamp = new Map<string, number>();
    for (const v of vaults) {
      for (const point of v.history) {
        const current = totalsByTimestamp.get(point.timestamp) ?? 0;
        totalsByTimestamp.set(point.timestamp, current + point.valueUsd);
      }
    }
    const totalGoalUsd = vaults.reduce((acc, v) => acc + (v.goalUsd ?? 0), 0);
    const timestamps = Array.from(totalsByTimestamp.keys()).sort();
    const history = timestamps.map((ts) => ({
      timestamp: ts,
      valueUsd: totalsByTimestamp.get(ts) ?? 0,
    }));
    if (!history.length) return null;
    const first = history[0].valueUsd;
    const last = history[history.length - 1].valueUsd;
    const changeUsd = Number((last - first).toFixed(2));
    const changePct = first ? (last - first) / first : 0;
    return {
      id: "all",
      name: "Vaults",
      symbol: "",
      assetAddress:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      decimals: 18,
      balanceUsd: last,
      goalUsd: totalGoalUsd,
      changeUsd,
      changePct,
      history,
    };
  }, [vaults]);

  if (loading && !vaults.length) {
    return <div className="p-4">Loading…</div>;
  }

  const changePctLabel = aggregateVault
    ? `${Math.round(aggregateVault.changePct * 100)}%`
    : "";
  return (
    <div className="flex flex-col text-xl items-start w-[393px] mx-auto">
      <SectionHeader title={"Vaults"} subtitle={changePctLabel} />

      <div className="w-full px-0">
        {aggregateVault ? <VaultGraph vault={aggregateVault} /> : null}
      </div>

      <Vaults
        vaults={vaults}
        onSelect={(v) => {
          // navigate to detail page
          window.location.href = `/vaults/${v.id}`;
        }}
      />
    </div>
  );
};

export default VaultsPage;

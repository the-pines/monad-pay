"use client";

import React from "react";
import Link from "next/link";
import { useVaults } from "@/hooks";
import type { UiVault } from "@/lib/types";
import VaultCard from "@/components/ui/Vault";
import ProgressCircle from "@/components/ui/ProgressCircle";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { Card, Button } from "@/components/ui";

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className='w-full px-4 py-5 relative'>
    {/* subtle radial wash */}
    <div className='pointer-events-none absolute inset-0'>
      <div className='absolute -top-8 -left-10 h-40 w-56 rounded-full bg-white/5 blur-3xl' />
    </div>

    <h1 className='display-text text-2xl font-semibold text-[#FBFAF9] tracking-tight'>
      {title}
    </h1>
    {subtitle ? (
      <div className='mt-2'>
        <span className='display-text text-lg font-semibold bg-gradient-to-r from-[#8A76F9] to-[#b7a5ff] bg-clip-text text-transparent'>
          {subtitle}
        </span>
      </div>
    ) : null}

    <div className='mt-4 h-px w-full bg-white/10' />
  </div>
);

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
    const last = history[history.length - 1].valueUsd;
    return {
      id: "all",
      name: "Vaults",
      symbol: "",
      assetAddress:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      decimals: 18,
      balanceUsd: last,
      goalUsd: totalGoalUsd,
      history,
    };
  }, [vaults]);

  const progress = React.useMemo(() => {
    if (!aggregateVault) return 0;
    const goal = aggregateVault.goalUsd || 0;
    const bal = aggregateVault.balanceUsd || 0;
    return goal > 0 ? Math.min(1, bal / goal) : 0;
  }, [aggregateVault]);

  if (loading) {
    return (
      <div className='flex flex-col items-start w-[393px] mx-auto'>
        <SectionHeader title='Vaults' />

        <div className='w-full px-4'>
          <div className='w-full flex flex-col items-center py-6'>
            <div className='w-[180px] h-[180px] rounded-full bg-white/10 animate-pulse' />
            <div className='mt-3 space-y-2 max-w-[340px] w-full'>
              <div className='h-3 w-40 mx-auto rounded bg-white/10 animate-pulse' />
              <div className='h-3 w-64 mx-auto rounded bg-white/10 animate-pulse' />
            </div>
          </div>
        </div>

        <div className='w-full px-4 pt-6'>
          <div className='h-5 w-28 rounded bg-white/10 animate-pulse mb-3' />
          <div className='grid grid-cols-2 gap-3'>
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className='h-[167px] rounded-3xl bg-[var(--card-surface)] border border-[var(--card-border)] soft-shadow animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col pb-3 items-start w-[393px] mx-auto'>
      <SectionHeader title='Vaults' />

      {aggregateVault ? (
        <div className='w-full px-4'>
          <div className='w-full flex flex-col items-center pt-2 pb-4'>
            <ProgressCircle
              value={progress}
              size={180}
              thickness={16}
              className='[--pc-start:#8A76F9] [--pc-end:#B7A5FF]'
            />
            <div className='mt-3 max-w-[340px] text-center text-white/70 text-[13px]'>
              <span role='img' aria-label='lightbulb' className='mr-1'>
                💡
              </span>
              Vaults are goal-based savings addresses. Add funds and when you
              reach your goal, you can withdraw. Share vaults with friends to
              help you save.
            </div>
          </div>
        </div>
      ) : null}

      {!vaults || vaults.length === 0 ? (
        <div className='px-4 py-8 w-full'>
          <Card className='w-full p-6 text-center'>
            <div className='display-text text-lg font-semibold'>
              No vaults yet
            </div>
            <div className='text-sm text-white/70 mt-1'>
              Create your first vault to start saving toward goals.
            </div>
            <div className='mt-4'>
              <Link href='/vaults/new'>
                <Button variant='primary'>Create a vault</Button>
              </Link>
            </div>
          </Card>
        </div>
      ) : null}

      {/* All vaults */}
      <div className='w-full px-4 pt-2'>
        <div className='display-text text-base font-semibold text-[#FBFAF9] mb-3'>
          All vaults
        </div>

        <div className='grid grid-cols-2 gap-3'>
          {vaults.map((v) => (
            <VaultCard
              key={v.id}
              vault={v}
              onSelect={(v) => (window.location.href = `/vaults/${v.id}`)}
            />
          ))}

          {/* Add new card – matches style */}
          <Link
            href='/vaults/new'
            className='relative h-[167px] rounded-3xl bg-[var(--card-surface)] border border-[var(--card-border)] interactive-gradient
                       hover:bg-[var(--card-surface-hover)] transition-colors soft-shadow
                       flex flex-col items-center justify-center gap-2 text-center focus:outline-none
                       focus:ring-2 focus:ring-[#8A76F9]/60'
            aria-label='Create new vault'
          >
            <PlusCircleIcon
              className='w-8 h-8 text-[#8A76F9]'
              aria-hidden='true'
            />
            <span className='display-text font-semibold text-[15px] text-[#FBFAF9]'>
              Add new
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VaultsPage;

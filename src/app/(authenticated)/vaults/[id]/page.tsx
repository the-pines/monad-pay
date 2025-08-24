'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { UiVault } from '@/lib/types';
import ProgressCircle from '@/components/ui/ProgressCircle';
import { VaultDetailSkeleton } from '@/components/feature';
import { useVaults } from '@/hooks';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { erc20Abi } from 'viem';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { parseUnits } from 'viem';
import { VAULT_ABI } from '@/config/contracts';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { formatToken } from '@/lib/format';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui';

// Skeleton moved to components/feature/Vaults/VaultDetailSkeleton

export default function VaultDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: vaults, loading: isVaultsLoading } = useVaults();
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { balance: balanceUsd } = useUser();

  const [isAddFundsOpen, setIsAddFundsOpen] = React.useState(false);
  const [addAmount, setAddAmount] = React.useState<string>('');
  const [addError, setAddError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSharedInfoOpen, setIsSharedInfoOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const vault = React.useMemo<UiVault | null>(() => {
    if (!vaults) return null;
    return vaults.find((v) => v.id === params.id) ?? null;
  }, [vaults, params.id]);

  // useVaults provides a loading flag; rely on it instead of checking undefined

  const erc20BalRead = useReadContract({
    address: (vault?.assetAddress ??
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(
        vault && !vault.isNative && isConnected && address && vault.assetAddress
      ),
    },
  });

  const nativeBalRead = useBalance({
    address,
    query: {
      enabled: Boolean(vault && vault.isNative && isConnected && address),
    },
  });

  const userTokenBalance = React.useMemo(() => {
    if (!vault) return 0;
    if (vault.isNative) {
      const raw = nativeBalRead.data?.value ?? BigInt(0);
      return Number(raw) / 10 ** 18;
    }
    const raw = (erc20BalRead.data as bigint | undefined) ?? BigInt(0);
    const d = vault.decimals ?? 18;
    return Number(raw) / 10 ** d;
  }, [vault, nativeBalRead.data, erc20BalRead.data]);

  const copyValue = React.useMemo(() => {
    if (!vault) return '';
    return String(vault.id);
  }, [vault]);

  const vaultBalanceRead = useReadContract({
    address: (vault?.id ??
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'assetBalance',
    query: {
      enabled: Boolean(vault?.id),
    },
  });

  const canWithdrawRead = useReadContract({
    address: (vault?.id ??
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'canWithdraw',
    query: {
      enabled: Boolean(vault?.id),
    },
  });

  const [isSubmittingMeta] = React.useState(false);
  const prevCanWithdraw = React.useRef<boolean>(false);
  const [isCelebrating, setIsCelebrating] = React.useState(false);
  React.useEffect(() => {
    const canW = Boolean(canWithdrawRead.data);
    if (!prevCanWithdraw.current && canW) {
      setIsCelebrating(true);
      const t = setTimeout(() => setIsCelebrating(false), 2200);
      return () => clearTimeout(t);
    }
    prevCanWithdraw.current = canW;
  }, [canWithdrawRead.data, canWithdrawRead]);

  async function handleCopy() {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleConfirmAddFunds() {
    if (!vault) return;
    const amount = Number(addAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddError('Enter a valid amount');
      return;
    }
    if (!isConnected) {
      setAddError('Connect your wallet first');
      return;
    }
    if (amount > userTokenBalance) {
      setAddError(`Insufficient ${vault.symbol} balance`);
      return;
    }
    setAddError(null);
    setIsSubmitting(true);
    try {
      const units = parseUnits(String(amount), vault.decimals);
      if (vault.isNative) {
        await writeContractAsync({
          address: vault.id as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'contributeNative',
          args: [],
          value: units,
        });
      } else {
        await writeContractAsync({
          address: vault.assetAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vault.id as `0x${string}`, units],
        });
        await writeContractAsync({
          address: vault.id as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'contribute',
          args: [units],
        });
      }
    } catch (err) {
      const msg =
        (err as Error)?.message || 'Something went wrong. Please try again.';
      setAddError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  React.useEffect(() => {
    if (!isSubmitting && !isSubmittingMeta) return;
    setIsAddFundsOpen(false);
    setAddAmount('');
    (async () => {
      try {
        const vb = vaultBalanceRead as unknown as {
          refetch?: () => Promise<unknown>;
        };
        const cw = canWithdrawRead as unknown as {
          refetch?: () => Promise<unknown>;
        };
        // Immediately refetch a few times to surface updates and celebration without manual refresh
        for (let i = 0; i < 4; i++) {
          await Promise.all([vb.refetch?.(), cw.refetch?.()]);
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [isSubmitting, isSubmittingMeta, vaultBalanceRead, canWithdrawRead]);

  const goalUnits = vault?.goalUsd ?? 0;
  const liveBalUnits = React.useMemo(() => {
    const d = vault?.decimals ?? 18;
    const raw = (vaultBalanceRead.data as bigint | undefined) ?? BigInt(0);
    return Number(raw) / 10 ** d;
  }, [vaultBalanceRead.data, vault?.decimals]);
  const progress = goalUnits > 0 ? Math.min(1, liveBalUnits / goalUnits) : 0;
  const progressPct = Math.round(progress * 100);

  if (isVaultsLoading) {
    return <VaultDetailSkeleton />;
  }

  if (!vault) {
    return (
      <div className="flex flex-col text-xl items-start w-[393px] mx-auto p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#FBFAF9]">
          <ArrowLeftIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-xl items-start w-[393px] mx-auto relative">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%22.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%%22 height=%22100%%22 filter=%22url(%23n)%22/></svg>')]" />

      <div className="flex flex-col items-start w-full bg-[#200052] p-4 relative z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#FBFAF9]"
          aria-label="Go back">
          <ArrowLeftIcon className="w-6 h-6" aria-hidden="true" />
          <span className="text-base">Back</span>
        </button>

        <h1 className="text-xl font-semibold text-[#FBFAF9] mt-7 mb-4">
          {vault.name}
        </h1>

        {vault.isShared ? (
          <div className="mt-2 inline-flex items-center gap-1 text-[12px] text-white/80 relative">
            <span className="rounded-full bg-white/10 px-2 py-0.5">
              SHARED WITH ME
            </span>
            <button
              type="button"
              aria-label="What does shared mean?"
              className="ml-1 text-white/70 hover:text-white/90"
              onClick={() => setIsSharedInfoOpen((v) => !v)}>
              <QuestionMarkCircleIcon className="w-4 h-4" aria-hidden="true" />
            </button>
            {isSharedInfoOpen ? (
              <div className="absolute top-full mt-1 left-0 z-20 w-[220px] rounded-lg bg-[#1A003F] text-white/90 text-[11px] p-2 border border-white/10 shadow-lg">
                You can contribute to this vault but only the owner can
                withdraw.
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex w-full justify-center mt-4">
          <ProgressCircle
            value={progress}
            size={160}
            thickness={16}
            label={`${progressPct}%`}
          />
        </div>
      </div>

      <div className="w-full bg-[#200052] px-4 pb-4 relative z-10">
        <div className="mt-3 w-[362px]">
          <div className="flex gap-3">
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3">
              <div className="text-[13px] text-white/50">Amount</div>
              <div
                className="text-[17px] font-bold leading-[22px]"
                style={{ color: '#8A76F9' }}>
                {formatToken(liveBalUnits, vault.symbol)}
              </div>
            </div>
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3">
              <div className="text-[13px] text-white/50">Goal</div>
              <div
                className="text-[17px] font-bold leading-[22px]"
                style={{ color: '#8A76F9' }}>
                {formatToken(vault.goalUsd, vault.symbol)}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Button
              type="button"
              onClick={() => setIsAddFundsOpen(true)}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r from-[#8A76F9] to-[#2dd4bf] hover:brightness-110 text-[#0B1B1B] font-medium">
              Add funds
            </Button>
            {Boolean(canWithdrawRead.data) && !vault.isShared ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await writeContractAsync({
                      address: vault.id as `0x${string}`,
                      abi: VAULT_ABI,
                      functionName: 'withdraw',
                      args: [],
                    });
                    const cw = canWithdrawRead as unknown as {
                      refetch?: () => Promise<unknown>;
                    };
                    const vb = vaultBalanceRead as unknown as {
                      refetch?: () => Promise<unknown>;
                    };
                    await cw.refetch?.();
                    await vb.refetch?.();
                    try {
                      await fetch('/api/vaults', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          creator: address,
                          vaultAddress: vault.id,
                        }),
                      });
                    } catch {}
                    setTimeout(() => router.push('/vaults'), 1200);
                  } catch {}
                }}
                className="mt-2 w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r from-[#8A76F9] to-[#2dd4bf] hover:brightness-110 text-[#0B1B1B] font-semibold">
                <span className="relative z-10">Withdraw</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)] text-[#FBFAF9] text-sm">
              <DocumentDuplicateIcon className="w-4 h-4" aria-hidden="true" />
              {copied ? 'Address copied' : 'Copy contract address'}
            </button>
          </div>
          <div className="mt-2 text-[13px] text-white/60">
            Share your vault address so others can contribute. Only the owner
            can withdraw when you hit the goal.
          </div>
        </div>
      </div>

      {isAddFundsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[360px] rounded-2xl bg-[#1A003F] p-4 text-[#FBFAF9]">
            <div className="text-lg font-semibold">
              Add funds to {vault.name}
            </div>
            <div className="mt-2 text-sm text-white/70">
              Available balance:{' '}
              {Number(balanceUsd ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="mt-3">
              <label className="block text-sm mb-1">
                Amount ({vault.symbol})
              </label>
              <input
                type="number"
                min={0}
                step={'any'}
                inputMode="decimal"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="w-full rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9]"
                placeholder="Enter amount"
              />
              {addError ? (
                <div className="mt-1 text-xs text-red-400">{addError}</div>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAddFundsOpen(false);
                  setAddAmount('');
                  setAddError(null);
                }}
                className="px-3 py-2 rounded-lg bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)]">
                Cancel
              </button>
              <Button
                type="button"
                onClick={handleConfirmAddFunds}
                disabled={isSubmitting}
                className="px-3 py-[22px] rounded-lg bg-[#2dd4bf] hover:brightness-110 disabled:opacity-60 text-[#0B1B1B]">
                {isSubmitting ? 'Adding…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isCelebrating ? (
        <div className="pointer-events-none fixed inset-0 z-40">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-3 rounded-sm"
              style={{
                left: `${(i * 7) % 100}%`,
                top: `-10%`,
                background:
                  i % 3 === 0 ? '#a48bff' : i % 3 === 1 ? '#ff83d1' : '#7ef9a7',
                animation: `drop ${1 + (i % 5) * 0.12}s ease-in ${
                  i * 0.05
                }s forwards`,
                transform: `rotate(${(i * 47) % 360}deg)`,
              }}
            />
          ))}
          <style jsx>{`
            @keyframes drop {
              0% {
                transform: translateY(-10vh) rotate(0deg);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              100% {
                transform: translateY(110vh) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}

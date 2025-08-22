"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import type { UiVault } from "@/lib/types";
import VaultGraph from "@/components/feature/Vaults/VaultGraph";
import { useUserBalanceUSD, useVaults } from "@/hooks";
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { ERC20_ABI } from "@/config/contracts";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits } from "viem";

function formatToken(amount: number, symbol?: string): string {
  const s = symbol || "";
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} ${s}`.trim();
}

export default function VaultDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: vaults, loading } = useVaults();
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: balanceUsd } = useUserBalanceUSD();
  const [isAddFundsOpen, setIsAddFundsOpen] = React.useState(false);
  const [addAmount, setAddAmount] = React.useState<string>("");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const vault = React.useMemo<UiVault | null>(() => {
    if (!vaults) return null;
    return vaults.find((v) => v.id === params.id) ?? null;
  }, [vaults, params.id]);

  const userTokenBalRaw = useReadContract({
    address: (vault?.assetAddress ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: Boolean(vault && isConnected && address) },
  });

  const userTokenBalance = React.useMemo(() => {
    const raw = (userTokenBalRaw.data as bigint | undefined) ?? BigInt(0);
    const d = vault?.decimals ?? 18;
    return Number(raw) / 10 ** d;
  }, [userTokenBalRaw.data, vault?.decimals]);

  const copyValue = React.useMemo(() => {
    if (!vault) return "";
    // Copy the contract address instead of a shareable link
    return String(vault.id);
  }, [vault]);

  async function handleCopy() {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
    } catch {
      // no-op for environments without clipboard permissions
    }
  }

  async function handleConfirmAddFunds() {
    if (!vault) return;
    const amount = Number(addAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddError("Enter a valid amount");
      return;
    }
    if (!isConnected) {
      setAddError("Connect your wallet first");
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
      // Single transaction: transfer token directly to the vault address
      await writeContractAsync({
        address: vault.assetAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [vault.id as `0x${string}`, units],
      });
      setIsAddFundsOpen(false);
      setAddAmount("");
    } catch (err) {
      const msg =
        (err as Error)?.message || "Something went wrong. Please try again.";
      setAddError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading && !vault) {
    return <div className="p-4">Loading…</div>;
  }

  if (!vault) {
    return (
      <div className="flex flex-col text-xl items-start w-[393px] mx-auto p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#FBFAF9]"
        >
          <ArrowLeftIcon className="w-5 h-5" aria-hidden="true" />
          Back
        </button>
        <div className="mt-4 text-white/70">Vault not found.</div>
      </div>
    );
  }

  const changePctLabel = `${Math.round((vault.changePct ?? 0) * 100)}%`;

  return (
    <div className="flex flex-col text-xl items-start w-[393px] mx-auto">
      <div className="flex flex-col items-start w-full bg-[#200052] p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#FBFAF9]"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-6 h-6" aria-hidden="true" />
          <span className="text-base">Back</span>
        </button>
        <h1 className="text-xl font-semibold text-[#FBFAF9] mt-2">
          {vault.name}
        </h1>
        <div className="mt-4">
          <span className="text-[18px] font-bold leading-[23px] text-[#836EF9]">
            {changePctLabel}
          </span>
        </div>
      </div>

      <div className="w-full bg-[#200052]">
        <VaultGraph vault={vault} />
      </div>

      <div className="w-full bg-[#200052] px-4 pb-4">
        <div className="mt-3 w-[362px]">
          <div className="flex gap-3">
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3">
              <div className="text-[13px] text-white/50">Amount</div>
              <div
                className="text-[17px] font-bold leading-[22px]"
                style={{ color: "#8A76F9" }}
              >
                {formatToken(vault.balanceUsd, vault.symbol)}
              </div>
            </div>
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3">
              <div className="text-[13px] text-white/50">Goal</div>
              <div
                className="text-[17px] font-bold leading-[22px]"
                style={{ color: "#8A76F9" }}
              >
                {formatToken(vault.goalUsd, vault.symbol)}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsAddFundsOpen(true)}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#836EF9] hover:brightness-110 text-[#FBFAF9] font-medium"
            >
              Add funds
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)] text-[#FBFAF9] text-sm"
            >
              <DocumentDuplicateIcon className="w-4 h-4" aria-hidden="true" />
              Copy contract address
            </button>
          </div>
          <div className="mt-2 text-[13px] text-white/60">
            Share your vault address so others can contribute. Only you can
            withdraw when you hit the goal.
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
              Available balance:{" "}
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
                step={"any"}
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
                  setAddAmount("");
                  setAddError(null);
                }}
                className="px-3 py-2 rounded-lg bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddFunds}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg bg-[#836EF9] hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? "Adding…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

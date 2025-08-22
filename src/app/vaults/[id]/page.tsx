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

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function VaultDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: vaults, loading } = useVaults();
  const { data: balanceUsd } = useUserBalanceUSD();
  const [isAddFundsOpen, setIsAddFundsOpen] = React.useState(false);
  const [addAmount, setAddAmount] = React.useState<string>("");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const vault = React.useMemo<UiVault | null>(() => {
    if (!vaults) return null;
    return vaults.find((v) => v.id === params.id) ?? null;
  }, [vaults, params.id]);

  const shareUrl = React.useMemo(() => {
    if (!vault) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/vaults/${vault.id}`;
  }, [vault]);

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // no-op for environments without clipboard permissions
    }
  }

  async function handleConfirmAddFunds() {
    if (!vault) return;
    const amount = Number(addAmount);
    const available = Number(balanceUsd ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddError("Enter a valid amount");
      return;
    }
    if (amount > available) {
      setAddError("Amount exceeds available balance");
      return;
    }
    setAddError(null);
    setIsSubmitting(true);
    try {
      await fetch(`/api/vaults/${vault.id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amount, source: "balance" }),
      });
      setIsAddFundsOpen(false);
      setAddAmount("");
    } catch {
      setAddError("Something went wrong. Please try again.");
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
                {formatUsd(vault.balanceUsd)}
              </div>
            </div>
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3">
              <div className="text-[13px] text-white/50">Goal</div>
              <div
                className="text-[17px] font-bold leading-[22px]"
                style={{ color: "#8A76F9" }}
              >
                {formatUsd(vault.goalUsd)}
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
              Copy shareable link
            </button>
          </div>
          <div className="mt-2 text-[13px] text-white/60">
            You can share this vault for others to contribute to. Only you can
            withdraw when you hit the goal. Cool thing about smart contracts :)
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
              Available balance: {formatUsd(Number(balanceUsd ?? 0))}
            </div>
            <div className="mt-3">
              <label className="block text-sm mb-1">Amount (USD)</label>
              <input
                type="number"
                min={0}
                step={1}
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

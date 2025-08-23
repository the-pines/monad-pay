"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import type { UiVault } from "@/lib/types";
import ProgressCircle from "@/components/ui/ProgressCircle";
import { useUserBalanceUSD, useVaults } from "@/hooks";
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { erc20Abi } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSignTypedData,
  useChainId,
} from "wagmi";
import { Abi, encodeFunctionData, parseUnits } from "viem";
import { VAULT_ABI } from "@/config/contracts";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { formatToken } from "@/lib/format";

export default function VaultDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: vaults } = useVaults();
  const { isConnected, address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { data: balanceUsd } = useUserBalanceUSD();
  const chainId = useChainId();
  const [isAddFundsOpen, setIsAddFundsOpen] = React.useState(false);
  const [addAmount, setAddAmount] = React.useState<string>("");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSharedInfoOpen, setIsSharedInfoOpen] = React.useState(false);

  const vault = React.useMemo<UiVault | null>(() => {
    if (!vaults) return null;
    return vaults.find((v) => v.id === params.id) ?? null;
  }, [vaults, params.id]);

  // Read user's balance depending on vault type
  const erc20BalRead = useReadContract({
    address: (vault?.assetAddress ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
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

  // For ERC20 permit: read token name and nonces(owner)
  const tokenNameRead = useReadContract({
    address: (vault?.assetAddress ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: erc20Abi,
    functionName: "name",
    query: {
      enabled: Boolean(vault && !vault.isNative && vault.assetAddress),
    },
  });
  const noncesAbi = [
    {
      type: "function",
      name: "nonces",
      stateMutability: "view",
      inputs: [{ name: "owner", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const satisfies Abi;
  const noncesRead = useReadContract({
    address: (vault?.assetAddress ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: noncesAbi,
    functionName: "nonces",
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(
        vault && !vault.isNative && vault.assetAddress && address
      ),
    },
  });

  const copyValue = React.useMemo(() => {
    if (!vault) return "";
    // Copy the contract address instead of a shareable link
    return String(vault.id);
  }, [vault]);

  // Live vault reads for balance & withdraw state
  const vaultBalanceRead = useReadContract({
    address: (vault?.id ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "assetBalance",
    query: {
      enabled: Boolean(vault?.id),
    },
  });

  const canWithdrawRead = useReadContract({
    address: (vault?.id ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "canWithdraw",
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
      let data: `0x${string}`;
      let valueStr = "0";
      if (vault.isNative) {
        // meta call contributeNative with value
        data = encodeFunctionData({
          abi: VAULT_ABI as Abi,
          functionName: "contributeNative",
          args: [],
        });
        valueStr = units.toString();
      } else {
        // Build EIP-2612 permit for token and call contributeWithPermit
        const tokenName =
          (tokenNameRead.data as string | undefined) ?? vault.symbol;
        const nonce = (noncesRead.data as bigint | undefined) ?? BigInt(0);
        const deadlineSec = Math.floor(Date.now() / 1000) + 60 * 60; // +1h
        const permitDomain = {
          name: tokenName,
          version: "1",
          chainId,
          verifyingContract: vault.assetAddress as `0x${string}`,
        } as const;
        const permitTypes = {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        } as const;
        const permitMessage = {
          owner: address as `0x${string}`,
          spender: vault.id as `0x${string}`,
          value: units,
          nonce,
          deadline: BigInt(deadlineSec),
        } as const;
        const sig = await signTypedDataAsync({
          domain: permitDomain,
          types: permitTypes,
          primaryType: "Permit",
          message: permitMessage,
        });
        const r = `0x${sig.slice(2, 66)}` as `0x${string}`;
        const s = `0x${sig.slice(66, 130)}` as `0x${string}`;
        let v = parseInt(sig.slice(130, 132), 16);
        if (v < 27) v += 27;

        data = encodeFunctionData({
          abi: VAULT_ABI as Abi,
          functionName: "contributeWithPermit",
          args: [units, BigInt(permitMessage.deadline), v, r, s],
        });
      }

      const prepRes = await fetch("/api/metatx/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: address,
          to: vault.id,
          data,
          value: valueStr,
          gas: "2000000",
        }),
      });
      if (!prepRes.ok) throw new Error("Failed to prepare meta-tx");
      const { request, domain, types } = await prepRes.json();

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "ForwardRequest",
        message: request,
      });

      const submitRes = await fetch("/api/metatx/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, signature }),
      });
      if (!submitRes.ok) throw new Error("Failed to submit meta-tx");
    } catch (err) {
      const msg =
        (err as Error)?.message || "Something went wrong. Please try again.";
      setAddError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // When add funds tx confirms, refresh reads and close modal
  React.useEffect(() => {
    if (!isSubmitting && !isSubmittingMeta) return;
    setIsAddFundsOpen(false);
    setAddAmount("");
    (async () => {
      try {
        const vb = vaultBalanceRead as unknown as {
          refetch?: () => Promise<unknown>;
        };
        const cw = canWithdrawRead as unknown as {
          refetch?: () => Promise<unknown>;
        };
        await Promise.all([vb.refetch?.(), cw.refetch?.()]);
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

  if (!vault) {
    return (
      <div className='flex flex-col text-xl items-start w-[393px] mx-auto p-4'>
        <button
          type='button'
          onClick={() => router.back()}
          className='flex items-center gap-2 text-[#FBFAF9]'
        >
          <ArrowLeftIcon className='w-5 h-5' aria-hidden='true' />
        </button>
        <div className='mt-4 text-white/70'>Vault not found.</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col text-xl items-start w-[393px] mx-auto min-h-screen relative'>
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%22.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%%22 height=%22100%%22 filter=%22url(%23n)%22/></svg>')]" />

      <div className='flex flex-col items-start w-full bg-[#200052] p-4 relative z-10'>
        <button
          type='button'
          onClick={() => router.back()}
          className='flex items-center gap-2 text-[#FBFAF9]'
          aria-label='Go back'
        >
          <ArrowLeftIcon className='w-6 h-6' aria-hidden='true' />
          <span className='text-base'>Back</span>
        </button>
        <h1 className='text-xl font-semibold text-[#FBFAF9] mt-2'>
          {vault.name}
        </h1>
        {vault.isShared ? (
          <div className='mt-2 inline-flex items-center gap-1 text-[12px] text-white/80 relative'>
            <span className='rounded-full bg-white/10 px-2 py-0.5'>
              SHARED WITH ME
            </span>
            <button
              type='button'
              aria-label='What does shared mean?'
              className='ml-1 text-white/70 hover:text-white/90'
              onClick={() => setIsSharedInfoOpen((v) => !v)}
            >
              <QuestionMarkCircleIcon className='w-4 h-4' aria-hidden='true' />
            </button>
            {isSharedInfoOpen ? (
              <div className='absolute top-full mt-1 left-0 z-20 w-[220px] rounded-lg bg-[#1A003F] text-white/90 text-[11px] p-2 border border-white/10 shadow-lg'>
                You can contribute to this vault but only the owner can
                withdraw.
              </div>
            ) : null}
          </div>
        ) : null}
        <div className='mt-4'>
          <ProgressCircle
            value={progress}
            size={160}
            thickness={16}
            label={`${progressPct}%`}
          />
        </div>
      </div>

      <div className='w-full bg-[#200052] px-4 pb-4 relative z-10'>
        <div className='mt-3 w-[362px]'>
          <div className='flex gap-3'>
            <div className='w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3'>
              <div className='text-[13px] text-white/50'>Amount</div>
              <div
                className='text-[17px] font-bold leading-[22px]'
                style={{ color: "#8A76F9" }}
              >
                {formatToken(liveBalUnits, vault.symbol)}
              </div>
            </div>
            <div className='w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] flex flex-col items-start justify-center p-3'>
              <div className='text-[13px] text-white/50'>Goal</div>
              <div
                className='text-[17px] font-bold leading-[22px]'
                style={{ color: "#8A76F9" }}
              >
                {formatToken(vault.goalUsd, vault.symbol)}
              </div>
            </div>
          </div>
          <div className='mt-3'>
            <button
              type='button'
              onClick={() => setIsAddFundsOpen(true)}
              className='w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#2dd4bf] hover:brightness-110 text-[#0B1B1B] font-medium'
            >
              Add funds
            </button>
            {Boolean(canWithdrawRead.data) && !vault.isShared ? (
              <button
                type='button'
                onClick={async () => {
                  try {
                    const data = encodeFunctionData({
                      abi: VAULT_ABI as Abi,
                      functionName: "withdraw",
                      args: [],
                    });
                    const prepRes = await fetch("/api/metatx/prepare", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        from: address,
                        to: vault.id,
                        data,
                        value: "0",
                        gas: "1200000",
                      }),
                    });
                    if (!prepRes.ok)
                      throw new Error("Failed to prepare meta-tx");
                    const { request, domain, types } = await prepRes.json();
                    const signature = await signTypedDataAsync({
                      domain,
                      types,
                      primaryType: "ForwardRequest",
                      message: request,
                    });
                    const submitRes = await fetch("/api/metatx/submit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ request, signature }),
                    });
                    if (!submitRes.ok)
                      throw new Error("Failed to submit meta-tx");
                    const cw = canWithdrawRead as unknown as {
                      refetch?: () => Promise<unknown>;
                    };
                    const vb = vaultBalanceRead as unknown as {
                      refetch?: () => Promise<unknown>;
                    };
                    await cw.refetch?.();
                    await vb.refetch?.();
                    // Remove from DB
                    try {
                      await fetch("/api/vaults", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          creator: address,
                          vaultAddress: vault.id,
                        }),
                      });
                    } catch {}
                    // Optional: navigate back after a brief delay
                    setTimeout(() => router.push("/vaults"), 1200);
                  } catch {
                    /* ignore */
                  }
                }}
                className='mt-2 w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#2dd4bf] hover:brightness-110 text-[#0B1B1B] font-semibold'
              >
                <span className='relative z-10'>Withdraw</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className='mt-4'>
          <div className='flex justify-center'>
            <button
              type='button'
              onClick={handleCopy}
              className='inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)] text-[#FBFAF9] text-sm'
            >
              <DocumentDuplicateIcon className='w-4 h-4' aria-hidden='true' />
              Copy contract address
            </button>
          </div>
          <div className='mt-2 text-[13px] text-white/60'>
            Share your vault address so others can contribute. Only the owner
            can withdraw when you hit the goal.
          </div>
        </div>
      </div>

      {isAddFundsOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='w-[360px] rounded-2xl bg-[#1A003F] p-4 text-[#FBFAF9]'>
            <div className='text-lg font-semibold'>
              Add funds to {vault.name}
            </div>
            <div className='mt-2 text-sm text-white/70'>
              Available balance:{" "}
              {Number(balanceUsd ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className='mt-3'>
              <label className='block text-sm mb-1'>
                Amount ({vault.symbol})
              </label>
              <input
                type='number'
                min={0}
                step={"any"}
                inputMode='decimal'
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className='w-full rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9]'
                placeholder='Enter amount'
              />
              {addError ? (
                <div className='mt-1 text-xs text-red-400'>{addError}</div>
              ) : null}
            </div>
            <div className='mt-4 flex gap-2 justify-end'>
              <button
                type='button'
                onClick={() => {
                  setIsAddFundsOpen(false);
                  setAddAmount("");
                  setAddError(null);
                }}
                className='px-3 py-2 rounded-lg bg-[rgba(251,250,249,0.06)] hover:bg-[rgba(251,250,249,0.1)]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleConfirmAddFunds}
                disabled={isSubmitting}
                className='px-3 py-2 rounded-lg bg-[#2dd4bf] hover:brightness-110 disabled:opacity-60 text-[#0B1B1B]'
              >
                {isSubmitting ? "Adding…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCelebrating ? (
        <div className='pointer-events-none fixed inset-0 z-40'>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className='absolute w-2 h-3 rounded-sm'
              style={{
                left: `${(i * 7) % 100}%`,
                top: `-10%`,
                background:
                  i % 3 === 0 ? "#a48bff" : i % 3 === 1 ? "#ff83d1" : "#7ef9a7",
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

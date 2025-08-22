"use client";

import React from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ERC20_ABI,
  VAULT_FACTORY_ABI,
  VAULT_FACTORY_ADDRESS,
} from "@/config/contracts";

// Minimal known ERC20 list to probe balances for; expand as needed
const ERC20_CANDIDATES = [
  {
    symbol: "WMON",
    name: "Wrapped Monad (WMON)",
    address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" as `0x${string}`,
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin (USDC)",
    address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}`,
    decimals: 6,
  },
] as const;

export default function CreateVaultClient() {
  const { isConnected, address } = useAccount();
  const { data: nativeBal } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });
  const erc20BalanceReads = useReadContracts({
    contracts: ERC20_CANDIDATES.map((t) => ({
      address: t.address,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: [address as `0x${string}`],
    })),
    query: { enabled: Boolean(address) },
    allowFailure: true,
  });
  const {
    writeContractAsync,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const router = useRouter();

  const [assetAddress, setAssetAddress] = React.useState<string>("");
  const [goal, setGoal] = React.useState<string>("");
  const [name, setName] = React.useState<string>("");
  const [decimals, setDecimals] = React.useState<number>(18);
  const [isNative, setIsNative] = React.useState<boolean>(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  const tokenOptions = React.useMemo(() => {
    const options: Array<{
      key: string;
      label: string;
      value: string;
      decimals: number;
      isNative: boolean;
    }> = [];
    const nativeAmount = Number(nativeBal?.value ?? BigInt(0)) / 1e18;
    if (nativeAmount > 0) {
      options.push({
        key: "native",
        label: "MON (native)",
        value: "native",
        decimals: 18,
        isNative: true,
      });
    }
    const balances = erc20BalanceReads.data ?? [];
    ERC20_CANDIDATES.forEach((t, idx) => {
      const balRaw = (balances[idx]?.result as bigint | undefined) ?? BigInt(0);
      const bal = Number(balRaw) / 10 ** t.decimals;
      if (bal > 0) {
        options.push({
          key: t.address,
          label: `${t.name} (${t.symbol})`,
          value: t.address,
          decimals: t.decimals,
          isNative: false,
        });
      }
    });
    if (options.length === 0) {
      // fallback: at least allow creating a native vault
      options.push({
        key: "native",
        label: "MON (native)",
        value: "native",
        decimals: 18,
        isNative: true,
      });
    }
    return options;
  }, [nativeBal?.value, erc20BalanceReads.data]);

  React.useEffect(() => {
    if (!tokenOptions.length) return;
    const first = tokenOptions[0];
    setIsNative(first.isNative);
    if (first.isNative) {
      setAssetAddress("");
      setDecimals(18);
    } else {
      setAssetAddress(first.value);
      setDecimals(first.decimals);
    }
  }, [tokenOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!isConnected) {
      setFormError("Connect your wallet first");
      return;
    }
    if (!VAULT_FACTORY_ADDRESS) {
      setFormError("Factory address not configured");
      return;
    }
    const goalFloat = Number(goal);
    if (!Number.isFinite(goalFloat) || goalFloat <= 0) {
      setFormError("Enter a valid goal amount");
      return;
    }
    try {
      const goalUnits = parseUnits(goal, decimals);
      if (isNative) {
        await writeContractAsync({
          address: VAULT_FACTORY_ADDRESS,
          abi: VAULT_FACTORY_ABI,
          functionName: "createVaultNative",
          args: [goalUnits, name || "My Vault"],
          gas: parseUnits("5000000", 0),
        });
      } else {
        const asset = assetAddress as `0x${string}`;
        if (!asset) {
          setFormError("Select a token");
          return;
        }
        await writeContractAsync({
          address: VAULT_FACTORY_ADDRESS,
          abi: VAULT_FACTORY_ABI,
          functionName: "createVaultERC20",
          args: [asset, goalUnits, name || "My Vault"],
          gas: parseUnits("5000000", 0),
        });
      }
    } catch (err) {
      const message = (err as Error).message || "Failed to submit transaction";
      setFormError(message);
    }
  }

  React.useEffect(() => {
    if (!isSuccess) return;
    // Optimistically persist and navigate back to list
    fetch("/api/vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || "My Vault",
        asset: assetAddress,
        goal,
        decimals,
        creator: address,
      }),
    }).finally(() => router.push("/vaults"));
  }, [isSuccess, router, address, name, assetAddress, goal, decimals]);

  return (
    <div className="flex flex-col text-xl items-start w-[393px] mx-auto">
      <div className="flex flex-col items-start w-full bg-[#200052] p-4">
        <div className="flex items-center gap-2">
          <Link
            href="/vaults"
            className="text-[#FBFAF9] hover:opacity-80 p-1 -ml-1 rounded"
          >
            <span aria-hidden>←</span>
          </Link>
          <h1 className="text-xl font-semibold text-[#FBFAF9]">
            Create a Vault
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full bg-[#200052] px-4 pb-6">
        <div className="mt-4">
          <label className="block text-sm text-white/70 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vacation"
            className="w-[362px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9]"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm text-white/70 mb-1">Token</label>
          <select
            value={isNative ? "native" : assetAddress}
            onChange={(e) => {
              const val = e.target.value;
              // tokenOptions built from wallet balances
              const options: Array<{
                key: string;
                label: string;
                value: string;
                decimals: number;
                isNative: boolean;
              }> = [];
              const nativeAmount = Number(nativeBal?.value ?? BigInt(0)) / 1e18;
              if (nativeAmount >= 0) {
                options.push({
                  key: "native",
                  label: "MON (native)",
                  value: "native",
                  decimals: 18,
                  isNative: true,
                });
              }
              const balances = erc20BalanceReads.data ?? [];
              ERC20_CANDIDATES.forEach((t, idx) => {
                const balRaw =
                  (balances[idx]?.result as bigint | undefined) ?? BigInt(0);
                const bal = Number(balRaw) / 10 ** t.decimals;
                if (bal >= 0) {
                  options.push({
                    key: t.address,
                    label: `${t.name} (${t.symbol})`,
                    value: t.address,
                    decimals: t.decimals,
                    isNative: false,
                  });
                }
              });
              const opt = options.find((o) =>
                o.isNative ? val === "native" : o.value === val
              );
              if (!opt) return;
              setIsNative(opt.isNative);
              if (opt.isNative) {
                setAssetAddress("");
                setDecimals(18);
              } else {
                setAssetAddress(opt.value);
                setDecimals(opt.decimals);
              }
            }}
            className="w-[362px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9]"
          >
            <option value="native" className="bg-[#200052] text-[#FBFAF9]">
              MON (native)
            </option>
            {ERC20_CANDIDATES.map((t) => (
              <option
                key={t.symbol}
                value={t.address}
                className="bg-[#200052] text-[#FBFAF9]"
              >
                {t.name} ({t.symbol})
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-white/70 mb-1">
              Goal (token units)
            </label>
            <input
              type="number"
              min={0}
              step={"any"}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="1000"
              className="w-[230px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9]"
            />
          </div>
        </div>

        {formError ? (
          <div className="mt-2 text-xs text-red-400">{formError}</div>
        ) : null}
        {writeError ? (
          <div className="mt-2 text-xs text-red-400">
            {String(writeError.message)}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-[362px] inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#836EF9] hover:brightness-110 text-[#FBFAF9] font-medium disabled:opacity-60"
          >
            {isPending
              ? "Confirm in wallet…"
              : isConfirming
              ? "Waiting for confirmation…"
              : "Create vault"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import React from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
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
import { ERC20_TOKENS } from "@/config/tokens";

// Probe known ERC-20s from config; only show those with positive balances

export default function CreateVaultClient() {
  const { isConnected, address } = useAccount();
  const { data: nativeBal } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });
  const erc20BalanceReads = useReadContracts({
    contracts: ERC20_TOKENS.map((t) => ({
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
  const [sharedAddress, setSharedAddress] = React.useState<string>("");
  const isAddingShared = sharedAddress.trim().length > 0;

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
        label: "MON",
        value: "native",
        decimals: 18,
        isNative: true,
      });
    }
    const balances = erc20BalanceReads.data ?? [];
    ERC20_TOKENS.forEach((t, idx) => {
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
    // If user holds neither native nor any probed ERC-20, still allow native
    if (options.length === 0) {
      options.push({
        key: "native",
        label: "MON",
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

  // Track creator's existing vaults from factory to diff after creation
  const creatorVaults = useReadContract({
    address: VAULT_FACTORY_ADDRESS,
    abi: VAULT_FACTORY_ABI,
    functionName: "getCreatorVaults",
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address && VAULT_FACTORY_ADDRESS) },
  });
  const preVaultsRef = React.useRef<`0x${string}`[]>([]);
  // Prevent duplicate persistence in dev/StrictMode double effects
  const didPersistRef = React.useRef<boolean>(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!isConnected) {
      setFormError("Connect your wallet first");
      return;
    }
    // Shared attach flow
    if (isAddingShared) {
      try {
        const addr = sharedAddress.trim().toLowerCase();
        const isHex = /^0x[0-9a-f]{40}$/.test(addr);
        if (!isHex) {
          setFormError("Enter a valid contract address");
          return;
        }
        await fetch("/api/vaults/attach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creator: address, vaultAddress: addr }),
        });
      } catch (err) {
        const message =
          (err as Error).message || "Failed to attach shared vault";
        setFormError(message);
        return;
      }
      router.push("/vaults");
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
      // Snapshot pre-existing vaults for this creator
      preVaultsRef.current =
        (creatorVaults.data as `0x${string}`[] | undefined) ?? [];
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
    if (!isSuccess || didPersistRef.current) return;
    // After confirmation, refetch creator's vaults, diff to get the new address, persist to DB, then navigate
    (async () => {
      try {
        const refetch = (
          creatorVaults as unknown as {
            refetch?: () => Promise<{ data?: `0x${string}`[] }>;
          }
        ).refetch;
        let after: `0x${string}`[] | undefined = creatorVaults.data as
          | `0x${string}`[]
          | undefined;
        if (refetch) {
          const res = await refetch();
          after = (res?.data ?? after) as `0x${string}`[] | undefined;
        }
        const beforeSet = new Set(preVaultsRef.current);
        const newAddress = (after ?? []).find((a) => !beforeSet.has(a));
        if (address && newAddress) {
          didPersistRef.current = true;
          await fetch("/api/vaults", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creator: address,
              vaultAddress: newAddress,
            }),
          });
        }
      } catch {
        // ignore errors, still navigate
      } finally {
        router.push("/vaults");
      }
    })();
  }, [
    isSuccess,
    router,
    address,
    name,
    assetAddress,
    goal,
    decimals,
    creatorVaults,
  ]);

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
          <h1 className="text-xl font-semibold text-[#FBFAF9]">Add a Vault</h1>
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
            disabled={isAddingShared}
            className="w-[362px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9] disabled:opacity-60"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm text-white/70 mb-1">Token</label>
          <select
            value={isNative ? "native" : assetAddress}
            onChange={(e) => {
              const val = e.target.value;
              const options = tokenOptions;
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
            disabled={isAddingShared}
            className="w-[362px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9] disabled:opacity-60"
          >
            {tokenOptions.map((t) => (
              <option
                key={t.key}
                value={t.isNative ? "native" : t.value}
                className="bg-[#200052] text-[#FBFAF9]"
              >
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-white/70 mb-1">
              Goal (number of tokens)
            </label>
            <input
              type="number"
              min={0}
              step={"any"}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="1000"
              disabled={isAddingShared}
              className="w-[230px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9] disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center w-full">
          <div className="h-px flex-1 bg-white/10" />
          <span className="mx-3 text-xs text-white/50">
            OR add someone else’s vault
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="mt-3">
          <label className="block text-sm text-white/70 mb-1">
            Vault contract address
          </label>
          <input
            type="text"
            inputMode="text"
            value={sharedAddress}
            onChange={(e) => setSharedAddress(e.target.value)}
            placeholder="0x…"
            className="w-[362px] rounded-lg bg-[rgba(251,250,249,0.06)] px-3 py-2 outline-none focus:ring-2 focus:ring-[#836EF9] text-[#FBFAF9]"
          />
          <div className="mt-1 text-[11px] text-white/50">
            Enter a vault contract to contribute as a collaborator.
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
            {isAddingShared
              ? "Add shared vault"
              : isPending
              ? "Confirm in wallet…"
              : isConfirming
              ? "Waiting for confirmation…"
              : "Add vault"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { readContract } from "wagmi/actions";

import { SERVER_WALLET_ADDRESS } from "@/config/contracts";
import { ERC20_TOKENS, type KnownErc20Token } from "@/config/tokens";

type AllowanceItem = {
  token: KnownErc20Token;
  allowance: bigint;
  loading: boolean;
  error?: string | null;
};

export default function RevokeApprovals() {
  const { address, isConnected } = useAccount();
  const wagmiCfg = useConfig();
  const { writeContractAsync, isPending } = useWriteContract();

  const [items, setItems] = useState<AllowanceItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOperate = Boolean(
    isConnected &&
      address &&
      SERVER_WALLET_ADDRESS &&
      String(SERVER_WALLET_ADDRESS).length > 0
  );

  const loadAllowances = useCallback(async () => {
    if (!canOperate) return;
    setRefreshing(true);
    setError(null);
    try {
      const results: AllowanceItem[] = [];
      for (const t of ERC20_TOKENS) {
        try {
          const allowance = (await readContract(wagmiCfg, {
            address: t.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address as `0x${string}`, SERVER_WALLET_ADDRESS],
          })) as bigint;
          results.push({ token: t, allowance, loading: false });
        } catch (err) {
          results.push({
            token: t,
            allowance: BigInt(0),
            loading: false,
            error: "read_failed",
          });
        }
      }
      setItems(results);
    } catch (err) {
      setError("Failed to load allowances");
    } finally {
      setRefreshing(false);
    }
  }, [address, canOperate, wagmiCfg]);

  useEffect(() => {
    void loadAllowances();
  }, [loadAllowances]);

  const nonZero = useMemo(
    () => items.filter((i) => i.allowance > BigInt(0)),
    [items]
  );

  const revokeOne = useCallback(
    async (token: KnownErc20Token) => {
      if (!address) return;
      await writeContractAsync({
        account: address as `0x${string}`,
        address: token.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [SERVER_WALLET_ADDRESS, BigInt(0)],
      });
      await loadAllowances();
    },
    [address, writeContractAsync, loadAllowances]
  );

  const revokeAll = useCallback(async () => {
    for (const it of nonZero) {
      try {
        await revokeOne(it.token);
      } catch {}
    }
  }, [nonZero, revokeOne]);

  if (!isConnected) {
    return (
      <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
        <p className='text-sm text-white/70'>
          Connect your wallet to manage approvals.
        </p>
      </div>
    );
  }

  if (!SERVER_WALLET_ADDRESS) {
    return (
      <div className='rounded-2xl border border-yellow-200/20 bg-yellow-400/10 p-4'>
        <p className='text-sm text-yellow-100'>
          Server wallet address not configured.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Manage token approvals</h2>
        <button
          onClick={loadAllowances}
          className='text-xs px-3 py-1 rounded-lg border border-white/15'
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p className='text-xs text-white/60'>
        Revoke spending approvals you previously granted to our settlement
        wallet.
      </p>

      {error && (
        <div className='rounded-xl border border-red-200/40 bg-red-400/10 px-3 py-2 text-sm text-red-200'>
          {error}
        </div>
      )}

      {nonZero.length === 0 ? (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-sm text-white/70'>No active approvals found.</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {nonZero.map((it) => (
            <div
              key={it.token.address}
              className='flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3'
            >
              <div className='flex items-center gap-3'>
                <span className='text-sm font-medium'>{it.token.symbol}</span>
                <span className='text-xs text-white/60'>{it.token.name}</span>
              </div>
              <button
                onClick={() => revokeOne(it.token)}
                className='text-xs px-3 py-1 rounded-lg border border-white/15'
                disabled={isPending}
              >
                {isPending ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))}

          <button
            onClick={revokeAll}
            className='w-full rounded-xl py-2 text-sm font-semibold border border-white/20'
            disabled={isPending}
          >
            {isPending ? "Revoking..." : "Revoke all"}
          </button>
        </div>
      )}
    </div>
  );
}

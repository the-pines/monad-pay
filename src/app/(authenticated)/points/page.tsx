"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import {
  AML_ABI,
  AML_ADDRESS,
  POINTS_TOKEN_ABI,
  POINTS_TOKEN_ADDRESS,
} from "@/config/contracts";
import { Card, Button } from "@/components/ui";

type LeaderboardEntry = {
  user: `0x${string}`;
  pts: bigint;
};

type LocalTask = {
  id: string;
  label: string;
  checked: boolean;
};

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

function isHexAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function toBigIntSafe(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(Math.trunc(value));
    if (typeof value === "string") return BigInt(value);
    return null;
  } catch {
    return null;
  }
}

function normalizeTopData(input: unknown): LeaderboardEntry[] {
  if (!Array.isArray(input)) return [];

  const out: LeaderboardEntry[] = [];
  for (const e of input) {
    if (e && typeof e === "object" && "user" in e && "pts" in e) {
      const obj = e as { user: unknown; pts: unknown };
      if (isHexAddress(obj.user)) {
        const pts = toBigIntSafe(obj.pts);
        if (pts !== null) out.push({ user: obj.user, pts });
      }
    } else if (Array.isArray(e) && e.length >= 2) {
      const u = e[0];
      const p = e[1];
      if (isHexAddress(u)) {
        const pts = toBigIntSafe(p);
        if (pts !== null) out.push({ user: u, pts });
      }
    }
  }

  return out.filter((x) => x.user !== ZERO_ADDRESS);
}

export default function PointsPage() {
  const router = useRouter();
  const { address } = useAccount();

  const enabledBalance = Boolean(address && POINTS_TOKEN_ADDRESS);
  const { data: balanceData, isLoading: balanceLoading } = useReadContract({
    address: POINTS_TOKEN_ADDRESS as `0x${string}`,
    abi: POINTS_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: enabledBalance },
  });

  const enabledTop = Boolean(AML_ADDRESS);
  const { data: topData, isLoading: topLoading } = useReadContract({
    address: AML_ADDRESS as `0x${string}`,
    abi: AML_ABI,
    functionName: "getTop",
    query: { enabled: enabledTop },
  });

  const balance = Number((balanceData as bigint | undefined) ?? BigInt(0));

  const top: LeaderboardEntry[] = useMemo(() => {
    if (!topData) return [];
    return normalizeTopData(topData);
  }, [topData]);

  const myIndex = useMemo(() => {
    if (!address) return -1;
    return top.findIndex((e) => e.user.toLowerCase() === address.toLowerCase());
  }, [top, address]);

  const [tasks, setTasks] = useState<LocalTask[]>([
    {
      id: "demo-1",
      label: "Create a vault and show us",
      checked: false,
    },
    {
      id: "demo-2",
      label: "Contribute to your vault",
      checked: false,
    },
    {
      id: "demo-3",
      label: "Bring a friend to us",
      checked: false,
    },
    {
      id: "demo-4",
      label: "Post on X about Monad Pay",
      checked: false,
    },
    {
      id: "demo-5",
      label: "Give Cat & Nacho product feedback",
      checked: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
    );
  };

  return (
    <div className='p-4 space-y-6'>
      <button
        type='button'
        onClick={() => router.back()}
        className='flex items-center gap-2 text-[#FBFAF9]'
      >
        <ArrowLeftIcon className='w-5 h-5' aria-hidden='true' />
        <span className='text-base'>Back</span>
      </button>

      <div className='flex flex-col gap-4'>
        <h1 className='text-xl font-semibold'>My Points</h1>

        <Card className='flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#FDE68A]/20 to-[#A7F3D0]/20 border-transparent'>
          <span className='text-sm text-white/70'>Current Balance</span>
          <div className='text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent'>
            {balanceLoading ? "…" : balance.toLocaleString()}
          </div>
          <span className='text-sm text-white/70'>Points</span>
        </Card>

        <Card className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>Leaderboard</h2>
            <span className='text-xs text-white/60'>Top 10</span>
          </div>
          <div className='divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10'>
            {topLoading ? (
              <div className='p-4 text-white/70'>Loading…</div>
            ) : top.length === 0 ? (
              <div className='p-4 text-white/70'>No entries yet.</div>
            ) : (
              top.slice(0, 10).map((entry, idx) => {
                const rank = idx + 1;
                const isMe =
                  address && entry.user.toLowerCase() === address.toLowerCase();
                const medal =
                  rank === 1
                    ? "🥇"
                    : rank === 2
                    ? "🥈"
                    : rank === 3
                    ? "🥉"
                    : `${rank}.`;
                return (
                  <div
                    key={`${entry.user}-${idx}`}
                    className={[
                      "flex items-center justify-between px-4 py-3",
                      isMe
                        ? "bg-white/5 ring-1 ring-emerald-300/30"
                        : "bg-transparent",
                    ].join(" ")}
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <span className='w-8 text-center'>{medal}</span>
                      <span
                        className={[
                          "truncate",
                          isMe ? "text-emerald-300" : "text-white/90",
                        ].join(" ")}
                      >
                        {shortenAddress(entry.user)}
                      </span>
                    </div>
                    <div
                      className={[
                        "font-semibold",
                        isMe ? "text-emerald-300" : "text-white",
                      ].join(" ")}
                    >
                      {Number(entry.pts).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {address && myIndex === -1 && (
            <div className='mt-3'>
              <Card className='bg-white/5 border-white/10'>
                <div className='px-4 py-3 flex items-center justify-between'>
                  <div className='flex flex-col'>
                    <span className='text-sm text-white/60'>Your position</span>
                    <span className='text-white/90'>Not in top 10</span>
                  </div>
                  <div className='text-right'>
                    <div className='text-xs text-white/60'>Your points</div>
                    <div className='font-semibold'>
                      {balanceLoading ? "…" : balance.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <p className='text-xs text-white/60'>
            The person at the Mobil3 hackathon with the highest number of points
            by Sunday evening will receive a special prize 🎁
          </p>
        </Card>

        <Card className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-lg font-semibold'>Make more points</h2>
            <p className='text-sm text-white/70'>
              Do these, then find Nacho & Cat at the venue and show them proof.
              They’ll reward you your points.
            </p>
          </div>

          <ul className='space-y-2'>
            {tasks.map((task) => (
              <li key={task.id} className='flex items-center justify-between'>
                <label className='flex items-center gap-3 cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    className='h-5 w-5 rounded-md border-white/20 bg-transparent'
                    checked={task.checked}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span className='text-white/90'>{task.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className='pt-2'>
            <Button
              className='animated-gradient text-black/90'
              onClick={() => router.push("/vaults")}
            >
              Explore vaults
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function shortenAddress(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

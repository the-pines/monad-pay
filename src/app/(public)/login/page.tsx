"use client";

import { useEffect } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  useEffect(() => {
    if (!isConnected) return;

    const next = searchParams.get("next") || "/";
    const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";

    router.replace(dest);
  }, [isConnected, router, searchParams]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      {/* Subtle animated gradient band (stripe-like), not full background */}
      <div className="pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 w-[120%] h-56 rounded-[56px] opacity-60 blur-2xl animated-gradient -rotate-6" />

      {/* Content container */}
      <section className="relative z-10 mx-auto flex min-h-[100svh] max-w-[480px] flex-col items-center justify-between px-6 py-10">
        <div className="flex-1" />

        <div className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center gap-3">
            <Image
              src="/assets/logo_white.png"
              alt="Monad Pay"
              width={28}
              height={28}
            />
            <p className="uppercase tracking-wide text-white/70 text-xs">
              Welcome to Monad Pay
            </p>
          </div>
          <h1 className="display text-4xl sm:text-[40px] font-semibold leading-tight">
            Pay with anything, anywhere
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-[34ch] mx-auto">
            Monad Pay makes it easy to spend your crypto balance anywhere that
            accepts VISA. Earn points as you pay, save for goals, and spend
            around the world. All self-custodial. Your keys, your crypto.
          </p>
        </div>

        <div className="w-full mt-8">
          {/* Animated multi‑color visual button with functional web component overlay */}
          <div className="relative">
            <button
              className="animated-gradient w-full rounded-3xl py-4 text-base font-semibold text-black/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => open?.()}
            >
              Connect Wallet
            </button>
          </div>
          <p className="mt-4 text-center text-white/60 text-sm">
            No sign-ups. Connect a wallet to get started in seconds.
          </p>
        </div>

        <div className="flex-1" />
      </section>
    </main>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

export default function LoginPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const connect = useCallback(async () => {
    setConnecting(true);

    open().finally(() => {
      setConnecting(false);
    });
  }, [open]);

  useEffect(() => {
    if (!isConnected) return;
    router.replace('/');
  }, [router, address, isConnected]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 w-[120%] h-56 rounded-[56px] opacity-60 blur-2xl animated-gradient -rotate-6" />

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
            accepts VISA. Your keys, your crypto.
          </p>
        </div>

        <div className="w-full mt-8">
          <div className="relative">
            <button
              className="animated-gradient w-full rounded-3xl py-4 text-base font-semibold text-black/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-60"
              onClick={connect}
              disabled={connecting}>
              {connecting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black/70 animate-spin" />
                  Opening wallet...
                </span>
              ) : (
                'Connect Wallet'
              )}
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

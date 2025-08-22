// working on this lol
"use client";

import React from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

export default function LoginScreen() {
  const { login } = useAuth();

  return (
    <div className="min-h-dvh bg-[--background] text-[--foreground] flex flex-col items-center">
      <header className="w-full pt-10 pb-2 bg-[#200052]">
        <div className="relative mx-auto max-w-[393px] w-full h-[104px]">
          <div className="w-[393px] h-14" />
          <div className="w-[393px] h-12 flex items-center justify-between px-4">
            <h1 className="font-bold text-[17px] leading-[22px] text-[--foreground]">
              Monad Pay
            </h1>
            <div className="h-10 w-[120px]" />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[393px] w-full pt-6 px-4">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-3xl w-full aspect-[393/220]">
            <div className="rounded-3xl w-full h-full flex flex-col items-center justify-center gap-4">
              <Image
                src="/assets/logo_white.png"
                alt="Monad Pay"
                width={64}
                height={64}
              />
              <h2 className="text-2xl font-extrabold">Welcome</h2>
              <p className="text-white/70 text-sm max-w-[280px]"></p>
              <button
                onClick={login}
                className="mt-8 inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-[#C0186A] text-white font-bold text-[17px] leading-[22px] shadow-[0_8px_24px_rgba(192,24,106,0.35)] active:scale-[0.99]"
              >
                Continue with wallet
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

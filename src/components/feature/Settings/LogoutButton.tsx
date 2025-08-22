"use client";

import React from "react";
import { useAuth } from "@/hooks";

export default function LogoutButton() {
  const { logout, address } = useAuth();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <div className="flex flex-col gap-2">
      {address ? (
        <div className="text-sm text-white/60">Signed in as {short}</div>
      ) : null}
      <button
        onClick={logout}
        className="inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-[#C0186A] text-white font-bold text-[17px] leading-[22px] active:scale-[0.99]"
      >
        Logout
      </button>
    </div>
  );
}

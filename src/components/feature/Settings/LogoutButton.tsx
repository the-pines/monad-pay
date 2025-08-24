"use client";

import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import React from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const { disconnect } = useDisconnect();
  const { address } = useAppKitAccount();
  const router = useRouter();

  const logout = async () => {
    // Navigate immediately; perform disconnect in background
    router.replace("/");
    void disconnect().catch(() => {});
  };

  return (
    <div className='flex flex-col gap-2'>
      {address ? (
        <div className='text-sm text-white/60'>Logged in as {address}</div>
      ) : null}
      <button
        onClick={logout}
        className='inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-[#C0186A] text-white font-bold text-[17px] leading-[22px] active:scale-[0.99]'
      >
        Logout
      </button>
    </div>
  );
}

'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

export default function LoginPage() {
  const router = useRouter();

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const connect = useCallback(async () => {
    await open();
  }, [open]);

  useEffect(() => {
    if (!isConnected) return;
    router.replace('/');
  }, [router, address, isConnected]);

  return (
    <div>
      <button
        onClick={connect}
        className="bg-blue-300 w-[100px] h-[75px] text-center">
        Enter Application
      </button>
    </div>
  );
}

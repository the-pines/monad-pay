'use client';

import { useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (!isConnected) return;

    const next = searchParams.get('next') || '/';
    const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/';

    router.replace(dest);
  }, [isConnected, router, searchParams]);

  return (
    <div>
      <appkit-button />
    </div>
  );
}

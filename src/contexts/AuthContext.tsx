'use client';

import { useEffect, useRef } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface AuthContextProps {
  children: React.ReactNode;
}

const AuthContext: React.FC<AuthContextProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ensured = useRef<Set<string>>(new Set());

  const { address, isConnected } = useAppKitAccount();

  // redirect to /login if disconnected
  useEffect(() => {
    console.log(isConnected);
    if (isConnected) return;

    const qs = searchParams.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;

    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isConnected, pathname, searchParams, router]);

  // ensure user exists when connected (once per session + cached)
  useEffect(() => {
    if (!isConnected || !address) return;

    const addr = address.toLowerCase();
    if (ensured.current.has(addr)) return;

    // skip if we've already ensured this address in this browser recently
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(`ue:${addr}`)) {
        ensured.current.add(addr);
        return;
      }
    } catch {
      /* ignore localStorage errors */
    }

    ensured.current.add(addr);

    fetch('/api/create-user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Catherine Presas',
        address: addr,
        provider: 'wallet',
      }),
    })
      .then(() => {
        try {
          if (typeof window !== 'undefined')
            localStorage.setItem(`ue:${addr}`, '1');
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        // allow retry later if it failed
        ensured.current.delete(addr);
      });
  }, [isConnected, address]);

  return <>{children}</>;
};

export default AuthContext;

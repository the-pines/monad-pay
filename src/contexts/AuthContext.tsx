// soz babe changed very slightly because it was breaking vaults
'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (isConnected) return;
    if (pathname.startsWith('/vault')) return;

    router.replace('/login');
  }, [isConnected, pathname, router]);

  return <>{children}</>;
};

export default AuthProvider;

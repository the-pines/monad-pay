'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount } from '@reown/appkit/react';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();

  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (isConnected) return;
    router.replace('/login');
  }, [router, isConnected]);

  return <>{children}</>;
};

export default AuthProvider;

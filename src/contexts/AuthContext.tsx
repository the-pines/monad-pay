'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount } from '@reown/appkit/react';

interface AuthContextProps {
  children: React.ReactNode;
}

const AuthContext: React.FC<AuthContextProps> = ({ children }) => {
  const router = useRouter();

  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (isConnected) return;
    router.replace('/login');
  }, [router, isConnected]);

  return <>{children}</>;
};

export default AuthContext;

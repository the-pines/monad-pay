'use client';

import { type ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { monadTestnet } from '@reown/appkit/networks';
import { wagmiAdapter, wagmiConfig } from '@/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cookieToInitialState, WagmiProvider } from 'wagmi';

createAppKit({
  adapters: [wagmiAdapter],
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  networks: [monadTestnet],
  defaultNetwork: monadTestnet,
  metadata: {
    name: 'monad-pay',
    description: 'Monad Pay',
    url: process.env.NEXT_PUBLIC_BASE_URL!,
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  features: {
    analytics: true,
  },
});

const queryClient = new QueryClient();

interface WalletContextProps {
  cookies: string | null;
  children: ReactNode;
}

const WalletContext: React.FC<WalletContextProps> = ({ cookies, children }) => {
  const initialState = cookieToInitialState(wagmiConfig, cookies);
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletContext;

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { AppKitNetwork, monadTestnet } from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "wagmi";
import { http } from "viem";

const networks: AppKitNetwork[] = [monadTestnet];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: process.env.NEXT_PUBLIC_REOW_PROJECT_ID!,
  networks,
  // Force WalletConnect RPC aggregator on the client to Reown
  transports: {
    [monadTestnet.id]: http(
      `https://rpc.walletconnect.com/v1?chainId=eip155:${monadTestnet.id}&projectId=${process.env.NEXT_PUBLIC_REOW_PROJECT_ID}`
    ),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

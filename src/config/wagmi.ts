import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork, monadTestnet } from '@reown/appkit/networks';
import { config } from './env';

export const networks: AppKitNetwork[] = [monadTestnet];

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId: config.projectId,
  networks,
});

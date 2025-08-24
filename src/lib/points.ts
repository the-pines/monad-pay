import { createWalletClient, createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";

import { AML_ABI, AML_ADDRESS } from "@/config/contracts";

const RPC_URL = process.env.MONAD_RPC_URL!;
const EXECUTOR_PK = process.env.EXECUTOR_PRIVATE_KEY! as `0x${string}`;

const account = privateKeyToAccount(EXECUTOR_PK);
const transport = http(RPC_URL);
const walletClient = createWalletClient({
  chain: monadTestnet,
  account,
  transport,
});
const publicClient = createPublicClient({ chain: monadTestnet, transport });

export async function broadcastAwardPoints(params: {
  to: Address;
  amount: bigint;
}): Promise<{ hash: `0x${string}` } | { error: string }> {
  try {
    if (!AML_ADDRESS) return { error: "AML_ADDRESS not configured" };
    const hash = await walletClient.writeContract({
      address: AML_ADDRESS,
      abi: AML_ABI,
      functionName: "award",
      args: [params.to, params.amount],
    });

    void publicClient.waitForTransactionReceipt({ hash }).catch(() => {});
    return { hash };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return { error: e?.message || "failed to broadcast award" };
  }
}

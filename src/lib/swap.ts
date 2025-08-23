import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  type Address,
  type Hex,
  concat,
  numberToHex,
  size,
  erc20Abi,
} from "viem";

import { ERC20_TOKENS } from "@/config/tokens";

const ZEROEX_API_BASE_URL = "https://api.0x.org";
const ZEROX_API_KEY = process.env.ZEROX_API_KEY;
const MONAD_RPC_URL = process.env.MONAD_RPC_URL;
const SERVER_WALLET_PK = process.env.SERVER_WALLET_PRIVATE_KEY;

const NATIVE_TOKEN_PLACEHOLDER = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function fundUserWithUsdcVia0x(userAddr: Address): Promise<void> {
  try {
    if (!MONAD_RPC_URL || !SERVER_WALLET_PK) return;

    const pk = SERVER_WALLET_PK.startsWith("0x")
      ? (SERVER_WALLET_PK as Hex)
      : (("0x" + SERVER_WALLET_PK) as Hex);
    const account = privateKeyToAccount(pk);
    const wallet = createWalletClient({
      account,
      transport: http(MONAD_RPC_URL),
    });
    const publicClient = createPublicClient({ transport: http(MONAD_RPC_URL) });

    const usdc = ERC20_TOKENS.find((t) => t.symbol === "USDC");
    if (!usdc) return;

    const oneUsdc = BigInt(10) ** BigInt(usdc.decimals);
    const chainId = await publicClient.getChainId();

    const headers: Record<string, string> = { "0x-version": "v2" };
    if (ZEROX_API_KEY) headers["0x-api-key"] = ZEROX_API_KEY;
    const base = ZEROEX_API_BASE_URL.replace(/\/$/, "");

    // get the amount of MON to sell to get 1 USDC
    // TODO probably a better way to do this
    type PriceResp = { buyAmount: string; sellAmount: string };
    let sellAmount = BigInt(10) ** BigInt(18) / BigInt(10);
    const priceParams1 = new URLSearchParams({
      chainId: String(chainId),
      buyToken: usdc.address,
      sellToken: NATIVE_TOKEN_PLACEHOLDER,
      sellAmount: sellAmount.toString(),
      taker: account.address,
    });
    const priceRes1 = await fetch(
      `${base}/swap/permit2/price?${priceParams1.toString()}`,
      {
        cache: "no-store",
        headers,
      }
    );
    if (!priceRes1.ok) return;
    const price1 = (await priceRes1.json()) as PriceResp;
    const buyAmt1 = BigInt(price1.buyAmount);
    if (buyAmt1 < oneUsdc && buyAmt1 > BigInt(0)) {
      sellAmount = (oneUsdc * sellAmount + buyAmt1 - BigInt(1)) / buyAmt1;
    }

    //  quote
    const quoteParams = new URLSearchParams({
      chainId: String(chainId),
      buyToken: usdc.address,
      sellToken: NATIVE_TOKEN_PLACEHOLDER,
      sellAmount: sellAmount.toString(),
      taker: account.address,
      slippagePercentage: "0.01",
    });
    const quoteRes = await fetch(
      `${base}/swap/permit2/quote?${quoteParams.toString()}`,
      {
        cache: "no-store",
        headers,
      }
    );
    if (!quoteRes.ok) return;
    const quote = (await quoteRes.json()) as {
      transaction?: { to?: Address; data?: Hex; value?: string; gas?: string };
      to?: Address;
      data?: Hex;
      value?: string;
      permit2?: { eip712?: Record<string, unknown> };
    };

    const txTo = (quote?.transaction?.to ?? quote?.to) as Address;
    let txData = (quote?.transaction?.data ?? quote?.data) as Hex;
    const rawValue = quote?.transaction?.value ?? quote?.value;
    const rawGas = quote?.transaction?.gas;

    if (quote?.permit2?.eip712 && txData) {
      const signature = await wallet.signTypedData({
        account,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(quote.permit2.eip712 as any),
      });
      const sigLenHex = numberToHex(size(signature as Hex), {
        signed: false,
        size: 32,
      });
      txData = concat([txData, sigLenHex as Hex, signature as Hex]);
    }

    const swapHash = await wallet.sendTransaction({
      chain: undefined,
      to: txTo,
      data: txData,
      value: typeof rawValue === "string" ? BigInt(rawValue) : undefined,
      gas: typeof rawGas === "string" ? BigInt(rawGas) : undefined,
    });
    await publicClient.waitForTransactionReceipt({ hash: swapHash });

    // check USDC balance and send up to 1 USDC
    const serverUsdcBalance = (await publicClient.readContract({
      address: usdc.address as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;

    const amountToSend =
      serverUsdcBalance >= oneUsdc ? oneUsdc : serverUsdcBalance;
    if (amountToSend === BigInt(0)) return;

    const transferHash = await wallet.writeContract({
      chain: undefined,
      address: usdc.address as Address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [userAddr, amountToSend],
    });
    await publicClient.waitForTransactionReceipt({ hash: transferHash });
  } catch (err) {
    console.error("Swapping error:", err);
  }
}

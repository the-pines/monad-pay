import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  Chain,
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
} from "viem";
import type { Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "@reown/appkit/networks";
import { FORWARDER_ABI, FORWARDER_ADDRESS } from "@/config/contracts";

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  request: z.object({
    from: z.string(),
    to: z.string(),
    value: z.string(),
    gas: z.string(),
    nonce: z.string(),
    deadline: z.string(),
    data: z.string(),
  }),
  signature: z.string(),
});

const rpcUrl = (
  monadTestnet as unknown as { rpcUrls?: { default?: { http?: string[] } } }
).rpcUrls?.default?.http?.[0];

export async function POST(req: NextRequest) {
  try {
    if (!FORWARDER_ADDRESS) {
      return NextResponse.json(
        { error: "FORWARDER_ADDRESS not configured" },
        { status: 500 }
      );
    }
    const PK = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!PK) {
      return NextResponse.json(
        { error: "SERVER_WALLET_PRIVATE_KEY not configured" },
        { status: 500 }
      );
    }

    const json = await req.json();
    const parsed = SubmitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { request, signature } = parsed.data;

    const account = privateKeyToAccount(
      `0x${PK.replace(/^0x/, "")}` as `0x${string}`
    );
    const publicClient = createPublicClient({
      chain: monadTestnet as unknown as Chain,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet as unknown as Chain,
      transport: http(rpcUrl),
    });

    // Pre-validate with forwarder.verify to catch signature/expiry/trust issues early
    const isValid = (await publicClient.readContract({
      address: FORWARDER_ADDRESS,
      abi: FORWARDER_ABI as Abi,
      functionName: "verify",
      args: [
        {
          from: request.from as `0x${string}`,
          to: request.to as `0x${string}`,
          value: BigInt(request.value),
          gas: BigInt(request.gas),
          nonce: BigInt(request.nonce),
          deadline: BigInt(request.deadline),
          data: request.data as `0x${string}`,
          signature: signature as `0x${string}`,
        },
      ],
    })) as boolean;

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            "Forward request not valid (verify=false). Check signature, deadline, or target trust.",
        },
        { status: 400 }
      );
    }

    // Encode forwarder.execute(req)
    const data = encodeFunctionData({
      abi: FORWARDER_ABI as Abi,
      functionName: "execute",
      args: [
        {
          from: request.from as `0x${string}`,
          to: request.to as `0x${string}`,
          value: BigInt(request.value),
          gas: BigInt(request.gas),
          nonce: BigInt(request.nonce),
          deadline: BigInt(request.deadline),
          data: request.data as `0x${string}`,
          signature: signature as `0x${string}`,
        },
      ],
    });

    const hash = await walletClient.sendTransaction({
      to: FORWARDER_ADDRESS,
      data,
      account,
      value: BigInt(request.value || "0"),
    });

    // Optional: wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return NextResponse.json({ hash, receipt });
  } catch (err) {
    console.error("[POST /api/metatx/submit] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

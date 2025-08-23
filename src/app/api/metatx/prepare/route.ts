import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import { Chain, createPublicClient, http } from "viem";
import type { Abi } from "viem";
import { monadTestnet } from "@reown/appkit/networks";
import { FORWARDER_ABI, FORWARDER_ADDRESS } from "@/config/contracts";

export const dynamic = "force-dynamic";

const PrepareSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  data: z.string().min(1),
  // pass as decimal strings to avoid JSON bigint issues
  value: z.string().optional().default("0"),
  gas: z.string().optional().default("1000000"),
  deadline: z.string().optional(),
});

const rpcUrl = (
  monadTestnet as unknown as { rpcUrls?: { default?: { http?: string[] } } }
).rpcUrls?.default?.http?.[0];
const publicClient = createPublicClient({
  chain: monadTestnet as unknown as Chain,
  transport: http(rpcUrl),
});

export async function POST(req: NextRequest) {
  try {
    if (!FORWARDER_ADDRESS) {
      return NextResponse.json(
        { error: "FORWARDER_ADDRESS not configured" },
        { status: 500 }
      );
    }

    const json = await req.json();
    const parsed = PrepareSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { from, to, data } = parsed.data;
    const value = BigInt(parsed.data.value ?? "0");
    const gas = BigInt(parsed.data.gas ?? "1000000");
    // default deadline: now + 1 hour
    const deadline = BigInt(
      parsed.data.deadline ?? Math.floor(Date.now() / 1000 + 60 * 60).toString()
    );

    // ERC2771Forwarder uses nonces(owner)
    const nonce = (await publicClient.readContract({
      address: FORWARDER_ADDRESS,
      abi: FORWARDER_ABI as Abi,
      functionName: "nonces",
      args: [from as `0x${string}`],
    })) as bigint;

    const chainId = await publicClient.getChainId();

    // Try to read domain details from the forwarder (eip712Domain); fallback to defaults
    let domainName = "ERC2771Forwarder";
    let domainVersion = "1";
    try {
      const info = (await publicClient.readContract({
        address: FORWARDER_ADDRESS,
        abi: FORWARDER_ABI as Abi,
        functionName: "eip712Domain",
        args: [],
      })) as unknown as {
        fields: string;
        name: string;
        version: string;
        chainId: bigint;
        verifyingContract: `0x${string}`;
        salt: `0x${string}`;
        extensions: bigint[];
      };
      if (info?.name) domainName = info.name;
      if (info?.version) domainVersion = info.version;
    } catch {}

    const request = {
      from,
      to,
      value: value.toString(),
      gas: gas.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      data,
    };

    const domain = {
      name: domainName,
      version: domainVersion,
      chainId,
      verifyingContract: FORWARDER_ADDRESS,
    } as const;

    const types = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    } as const;

    return NextResponse.json({
      request,
      domain,
      types,
      primaryType: "ForwardRequest",
    });
  } catch (err) {
    console.error("[POST /api/metatx/prepare] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import z from "zod";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "@reown/appkit/networks";
import { AML_ABI, AML_ADDRESS } from "@/config/contracts";

export const dynamic = "force-dynamic";

const CreateUserSchema = z.object({
  name: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  address: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  provider: z.enum(["gmail", "apple", "wallet"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, address, provider } = parsed.data;
    const normalizedAddress = address.toLowerCase();

    // if the address already exists, do nothing.
    const inserted = await db
      .insert(users)
      .values({ name, address: normalizedAddress, provider })
      .onConflictDoNothing({ target: users.address })
      .returning();

    if (inserted.length > 0) {
      // First-time signup: optionally award 1000 points via AML if server signer configured
      try {
        const PK = process.env.AML_SIGNER_PRIVATE_KEY;
        if (PK && AML_ADDRESS) {
          const account = privateKeyToAccount(
            `0x${PK.replace(/^0x/, "")}` as `0x${string}`
          );
          const wallet = createWalletClient({
            account,
            chain: monadTestnet,
            transport: http(),
          });
          await wallet.writeContract({
            address: AML_ADDRESS as `0x${string}`,
            abi: AML_ABI,
            functionName: "award",
            args: [normalizedAddress as `0x${string}`, BigInt(1000)],
          });
        }
      } catch (e) {
        console.error("[create-user] awarding points failed:", e);
      }

      return NextResponse.json(
        { created: true, user: inserted[0] },
        { status: 201 }
      );
    }

    // if exists, fetch the existing record to return it
    const existing = await db.query.users.findFirst({
      where: eq(users.address, normalizedAddress),
    });

    return NextResponse.json(
      { created: false, user: existing },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/create-user] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

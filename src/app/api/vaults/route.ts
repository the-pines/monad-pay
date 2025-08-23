import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { users, vaults } from "@/db/schema";

export const dynamic = "force-dynamic";

const CreateVaultBody = z.object({
  creator: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
  vaultAddress: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
});

// Create a vault record after on-chain creation.
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreateVaultBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { creator, vaultAddress } = parsed.data;

    // Ensure user exists
    let user = await db.query.users.findFirst({
      where: eq(users.address, creator),
    });
    if (!user) {
      const inserted = await db
        .insert(users)
        .values({
          address: creator,
          name: creator,
          provider: "wallet" as const,
        })
        .onConflictDoNothing({ target: users.address })
        .returning();
      user =
        inserted[0] ??
        (await db.query.users.findFirst({ where: eq(users.address, creator) }));
      if (!user) {
        return NextResponse.json(
          { error: "User not found or created" },
          { status: 500 }
        );
      }
    }

    // Skip if already exists for this user/address
    const existing = await db.query.vaults.findFirst({
      where: and(eq(vaults.userId, user.id), eq(vaults.address, vaultAddress)),
    });
    if (existing) {
      return NextResponse.json(
        { created: false, vault: existing },
        { status: 200 }
      );
    }

    const created = await db
      .insert(vaults)
      .values({ userId: user.id, address: vaultAddress })
      .onConflictDoNothing()
      .returning();

    return NextResponse.json(
      { created: Boolean(created[0]), vault: created[0] ?? existing },
      { status: created[0] ? 201 : 200 }
    );
  } catch (err) {
    console.error("[POST /api/vaults] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fetch vault contract addresses for a given user address
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").trim().toLowerCase();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.address, address),
    });
    if (!user) {
      return NextResponse.json([]);
    }

    const rows = await db.query.vaults.findMany({
      where: eq(vaults.userId, user.id),
    });
    const addresses = rows.map((v) => v.address);
    return NextResponse.json(addresses);
  } catch (err) {
    console.error("[GET /api/vaults] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const DeleteVaultBody = z.object({
  creator: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
  vaultAddress: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
});

// Delete a vault mapping after withdraw
export async function DELETE(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = DeleteVaultBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { creator, vaultAddress } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.address, creator),
    });
    if (!user) {
      return NextResponse.json({ deleted: false }, { status: 200 });
    }

    await db
      .delete(vaults)
      .where(and(eq(vaults.userId, user.id), eq(vaults.address, vaultAddress)));

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/vaults] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

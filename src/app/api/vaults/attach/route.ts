import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { users, vaults } from "@/db/schema";

export const dynamic = "force-dynamic";

const AttachVaultBody = z.object({
  creator: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
  vaultAddress: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase()),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = AttachVaultBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { creator, vaultAddress } = parsed.data;

    let contributor = await db.query.users.findFirst({
      where: eq(users.address, creator),
    });
    if (!contributor) {
      const inserted = await db
        .insert(users)
        .values({
          address: creator,
          name: creator,
          provider: "wallet" as const,
        })
        .onConflictDoNothing({ target: users.address })
        .returning();
      contributor =
        inserted[0] ??
        (await db.query.users.findFirst({ where: eq(users.address, creator) }));
      if (!contributor) {
        return NextResponse.json(
          { error: "User not found or created" },
          { status: 500 }
        );
      }
    }

    const existingForAddress = await db.query.vaults.findMany({
      where: eq(vaults.address, vaultAddress),
    });

    const existingContributorMap = await db.query.vaults.findFirst({
      where: and(
        eq(vaults.userId, contributor.id),
        eq(vaults.address, vaultAddress)
      ),
    });
    let contributorMap = existingContributorMap;
    if (!contributorMap) {
      const inserted = await db
        .insert(vaults)
        .values({ userId: contributor.id, address: vaultAddress })
        .onConflictDoNothing()
        .returning();
      contributorMap = inserted[0] ?? null;
    }

    for (const row of existingForAddress) {
      if (row.userId === contributor.id) continue;
      const current = row.collaborators ?? [];
      if (current.includes(creator)) continue;
      const updated = [...current, creator];
      await db
        .update(vaults)
        .set({ collaborators: updated })
        .where(
          and(eq(vaults.userId, row.userId), eq(vaults.address, vaultAddress))
        );
    }

    // Ensure contributor also has a mapping so they can see the shared vault
    if (!contributorMap) {
      await db
        .insert(vaults)
        .values({ userId: contributor.id, address: vaultAddress })
        .onConflictDoNothing();
    }

    return NextResponse.json({ attached: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/vaults/attach] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

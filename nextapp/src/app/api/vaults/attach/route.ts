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

// Attach an existing vault (owned by someone else) to the current user, and
// add the user as a collaborator on the owner's vault record if present.
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

    // Ensure contributor user exists
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

    // Look up any existing vault rows for this address
    const existingForAddress = await db.query.vaults.findMany({
      where: eq(vaults.address, vaultAddress),
    });
    if (existingForAddress.length === 0) {
      return NextResponse.json(
        { error: "Vault not found in database" },
        { status: 404 }
      );
    }

    // Ensure mapping exists for contributor
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

    // Add contributor address to collaborators for any rows not owned by them
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

    return NextResponse.json({ attached: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/vaults/attach] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

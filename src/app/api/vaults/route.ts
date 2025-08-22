import { NextRequest } from "next/server";
import type { UiVault } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, goal, decimals } = body as {
    name?: string;
    asset?: string;
    goal?: string;
    decimals?: number;
  };
  // Append a placeholder vault for UI; in real app we'd index on-chain
  const goalNum = Number(goal ?? 0);
  return Response.json({ ok: true });
}

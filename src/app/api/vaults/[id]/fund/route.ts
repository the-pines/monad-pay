import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const amountUsd = Number(body?.amountUsd ?? 0);
    const source = String(body?.source ?? "");
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (source !== "balance") {
      return NextResponse.json(
        { error: "Unsupported source" },
        { status: 400 }
      );
    }
    // Placeholder: this would enqueue a funding operation for vault params.id
    return NextResponse.json({
      ok: true,
      vaultId: params.id,
      amountUsd,
      source,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

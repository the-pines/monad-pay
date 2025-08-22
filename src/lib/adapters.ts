import type { DbPayment, DbTransfer, UiTransaction } from "./types";

export function mapPaymentToUiTransaction(payment: DbPayment): UiTransaction {
  const amountPrimary = safeParseNumber(payment.amount);
  let amountUsd: number | undefined;
  return {
    id: payment.id,
    title: payment.entity,
    note: noteFromPayment(payment),
    amountPrimary,
    amountUsd,
    direction: amountPrimary >= 0 ? "out" : "in",
    datetime: payment.createdAt,
  };
}

export function mapTransferToUiTransaction(
  transfer: DbTransfer,
  currentAddress: string
): UiTransaction {
  const amountUsd = convertTokenAmountToFloat(
    transfer.amount,
    transfer.decimals
  );
  const isOutgoing =
    transfer.sender.toLowerCase() === currentAddress.toLowerCase();
  return {
    id: transfer.id,
    title: isOutgoing
      ? `Sent ${transfer.symbol}`
      : `Received ${transfer.symbol}`,
    amountPrimary: 0, // unknown fiat conversion for now
    amountUsd,
    direction: isOutgoing ? "out" : "in",
    datetime: transfer.createdAt,
  };
}

function noteFromPayment(payment: DbPayment): string | undefined {
  if (payment.amount === "0") return "Card verification";
  return undefined;
}

function safeParseNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function convertTokenAmountToFloat(
  amountRaw: string,
  decimals: number
): number {
  try {
    const big = BigInt(amountRaw);
    const base = BigInt(10) ** BigInt(decimals);
    const integer = Number(big / base);
    const fraction = Number(big % base) / Number(base);
    return integer + fraction;
  } catch {
    const asNum = Number(amountRaw);
    const denom = 10 ** decimals;
    return asNum / denom;
  }
}

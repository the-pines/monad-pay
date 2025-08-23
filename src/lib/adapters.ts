import type { DbPayment, UiTransaction } from "./types";

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

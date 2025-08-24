export function formatToken(amount: number, symbol?: string): string {
  const tokenSymbol = symbol || "";
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${tokenSymbol}`.trim();
}

export function formatToken(amount: number, symbol?: string): string {
  const tokenSymbol = symbol || "";
  const absoluteAmount = Math.abs(amount);
  const maximumFractionDigits =
    absoluteAmount < 1 ? 3 : absoluteAmount < 10 ? 2 : 0;
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits,
  })} ${tokenSymbol}`.trim();
}

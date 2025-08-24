export type UiTransaction = {
  id: string;
  title: string;
  note?: string;
  amountPrimary: number; // currency amount in primary currency
  amountUsd?: number; // converted USD amount
  direction: 'in' | 'out';
  datetime: string; // ISO 8601
};

export type UiVault = {
  id: string;
  name: string; // e.g., Vacation, New Car
  symbol: string; // ERC20 symbol, e.g., MON or USDC
  assetAddress: `0x${string}`; // ERC20 token address
  decimals: number; // token decimals
  isNative?: boolean; // true if native MON vault
  // Address of the on-chain creator/owner (read from contract)
  creator?: `0x${string}` | string;
  // True if this vault is owned by someone else but visible to current user
  isShared?: boolean;
  balanceUsd: number; // current balance
  goalUsd: number; // target goal for the vault
  history: Array<{ timestamp: string; valueUsd: number }>; // ordered oldest->newest
};

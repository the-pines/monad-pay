export type KnownErc20Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
};

// Known ERC20s from here https://docs.monad.xyz/developer-essentials/network-information
export const ERC20_TOKENS: readonly KnownErc20Token[] = [
  {
    symbol: "WMON",
    name: "Wrapped Monad",
    address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
    decimals: 6,
  },
  {
    symbol: "WBTC",
    name: "Wrapped BTC",
    address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d",
    decimals: 8,
  },
  {
    symbol: "WETH",
    name: "Wrapped ETH",
    address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37",
    decimals: 18,
  },
  {
    symbol: "WSOL",
    name: "Wrapped SOL",
    address: "0x5387C85A4965769f6B0Df430638a1388493486F1",
    decimals: 9,
  },
] as const;

// Static USD prices for display and total balance
export const TOKEN_USD_PRICE: Readonly<Record<string, number>> = {
  MON: 3.4,
  WMON: 3.4,
  USDC: 1,
  USDT: 1,
};

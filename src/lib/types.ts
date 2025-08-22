export type Provider = "gmail" | "apple" | "wallet";
export type CardStatus = "active" | "inactive" | "deleted";
export type PaymentStatus = "started" | "completed" | "cancelled";

export type DbTimestamp = string; // ISO 8601

export type DbUser = {
  id: string;
  address: string;
  balance: number; // numeric in DB
  provider: Provider;
  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
};

export type DbCard = {
  id: string;
  userId: string;
  stripeId: string;
  stripeCardId: string;
  status: CardStatus;
  spendingLimit: number;
  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
};

export type DbPayment = {
  id: string;
  cardId: string;
  orderId: string;
  entity: string; // merchant name
  currency: string; // e.g. USD, MXN
  amount: string; // numeric in DB, keep as string here
  status: PaymentStatus;
  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
};

export type DbExecution = {
  id: string;
  paymentId: string;
  symbol: string; // e.g. MON
  amount: string; // big int as string
  decimals: number; // token decimals
  txHash: string;
  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
};

export type DbTransfer = {
  id: string;
  userId: string;
  symbol: string;
  amount: string; // big int as string
  decimals: number;
  sender: string;
  receiver: string;
  txHash: string;
  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
};

// UI-facing types
export type UiTransaction = {
  id: string;
  title: string;
  note?: string;
  amountPrimary: number; // currency amount in primary currency
  amountUsd?: number; // converted USD amount
  direction: "in" | "out";
  datetime: string; // ISO 8601
};

export type UiCardPublic = {
  cardholderName: string;
  cardNumber: string; // 16 digits for display formatting
  expiry: string; // MM/YYYY
  cvv: string; // display only in this fake layer
};

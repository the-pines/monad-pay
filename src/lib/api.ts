import type {
  DbCard,
  DbPayment,
  DbTransfer,
  DbUser,
  UiCardPublic,
  UiTransaction,
} from "./types";

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Minimal local in-memory mocks to satisfy hooks without unused data layer files
const currentUser: DbUser = {
  id: "user_1",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  balance: 1275,
  provider: "wallet",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const userCard: DbCard = {
  id: "card_1",
  userId: currentUser.id,
  stripeId: "_test_",
  stripeCardId: "_test_card_",
  status: "active",
  spendingLimit: 500,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const payments: DbPayment[] = [];
const transfers: DbTransfer[] = [];

export async function fetchCurrentUser(): Promise<DbUser> {
  return delay(currentUser);
}

export async function fetchUserBalanceUSD(): Promise<number> {
  return delay(currentUser.balance);
}

export async function fetchUserCard(): Promise<DbCard | undefined> {
  return delay(userCard);
}

export async function fetchUserTransactions(): Promise<UiTransaction[]> {
  const user = currentUser;

  const mapPaymentToUiTransaction = (p: DbPayment): UiTransaction => ({
    id: p.id,
    title: p.entity,
    note: p.amount === "0" ? "Card verification" : undefined,
    amountPrimary: Number(p.amount) / 100,
    amountUsd: Number(p.amount) / 100,
    direction: "out",
    datetime: p.createdAt,
  });

  const mapTransferToUiTransaction = (
    t: DbTransfer,
    userAddress: string
  ): UiTransaction => ({
    id: t.id,
    title: t.symbol,
    amountPrimary: Number(t.amount) / 10 ** t.decimals,
    amountUsd: Number(t.amount) / 10 ** t.decimals,
    direction:
      t.receiver.toLowerCase() === userAddress.toLowerCase() ? "in" : "out",
    datetime: t.createdAt,
  });

  const paymentTxs = payments.map(mapPaymentToUiTransaction);
  const transferTxs = transfers.map((t) =>
    mapTransferToUiTransaction(t, user.address)
  );

  const combined = [...paymentTxs, ...transferTxs].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );
  return delay(combined);
}

export async function fetchVirtualCardDisplay(): Promise<UiCardPublic> {
  return delay({
    cardholderName: "Satoshi Nakamoto",
    cardNumber: "4242424242424242",
    expiry: "12/2029",
    cvv: "123",
  });
}

// Removed unused fetchVaults (vaults are sourced via hooks and /api/vaults mapping)

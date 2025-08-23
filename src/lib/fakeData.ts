import type {
  DbCard,
  DbExecution,
  DbPayment,
  DbTimestamp,
  DbUser,
  DbTransfer,
} from "./types";

const now = new Date();

function iso(date: Date): DbTimestamp {
  return date.toISOString();
}

export const FAKE_USER_ID = "u1";
export const FAKE_CARD_ID = "c1";

export const usersFake: DbUser[] = [
  {
    id: FAKE_USER_ID,
    address: "0x7cCFe1e5b8b6b3f3A9b6B0c6F3d2E1a0cFeE1234",
    balance: 1234.56,
    provider: "wallet",
    createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90)),
    updatedAt: iso(now),
  },
];

export const cardsFake: DbCard[] = [
  {
    id: FAKE_CARD_ID,
    userId: FAKE_USER_ID,
    stripeId: "acct_1FakeStripe",
    stripeCardId: "card_1FakeStripe",
    status: "active",
    spendingLimit: 0,
    createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60)),
    updatedAt: iso(now),
  },
];

export const virtualCardDisplay = {
  cardholderName: "Cat McGee",
  fullCardNumber: "4562112245957852",
  expiry: "12/2028",
  cvv: "210",
};

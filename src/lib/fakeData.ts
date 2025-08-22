import type {
  DbCard,
  DbExecution,
  DbPayment,
  DbTimestamp,
  DbUser,
  DbTransfer,
  UiVault,
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

export const paymentsFake: DbPayment[] = [
  {
    id: "p1",
    cardId: FAKE_CARD_ID,
    orderId: "o-1001",
    entity: "Coffee Shop",
    currency: "MXN",
    amount: "3.75",
    status: "completed",
    createdAt: "2024-01-03T09:30:00Z",
    updatedAt: "2024-01-03T09:30:00Z",
  },
  {
    id: "p2",
    cardId: FAKE_CARD_ID,
    orderId: "o-1002",
    entity: "Acme Groceries",
    currency: "MXN",
    amount: "120.15",
    status: "completed",
    createdAt: "2023-11-28T12:05:00Z",
    updatedAt: "2023-11-28T12:05:00Z",
  },
  {
    id: "p3",
    cardId: FAKE_CARD_ID,
    orderId: "o-1003",
    entity: "Fresno Breakfast House",
    currency: "MXN",
    amount: "0",
    status: "completed",
    createdAt: "2023-12-13T01:09:00Z",
    updatedAt: "2023-12-13T01:09:00Z",
  },
  {
    id: "p4",
    cardId: FAKE_CARD_ID,
    orderId: "o-1004",
    entity: "www.gphe.co.uk",
    currency: "MXN",
    amount: "0.84",
    status: "completed",
    createdAt: "2023-12-13T01:45:00Z",
    updatedAt: "2023-12-13T01:45:00Z",
  },
  {
    id: "p5",
    cardId: FAKE_CARD_ID,
    orderId: "o-1005",
    entity: "Balooworld",
    currency: "MXN",
    amount: "0.84",
    status: "completed",
    createdAt: "2023-12-13T01:01:00Z",
    updatedAt: "2023-12-13T01:01:00Z",
  },
  {
    id: "p6",
    cardId: FAKE_CARD_ID,
    orderId: "o-1006",
    entity: "Weddinghorseshoes",
    currency: "MXN",
    amount: "0.84",
    status: "completed",
    createdAt: "2023-12-11T15:40:00Z",
    updatedAt: "2023-12-11T15:40:00Z",
  },
  {
    id: "p7",
    cardId: FAKE_CARD_ID,
    orderId: "o-1007",
    entity: "www.erosfy.com",
    currency: "MXN",
    amount: "0.84",
    status: "completed",
    createdAt: "2023-12-11T15:30:00Z",
    updatedAt: "2023-12-11T15:30:00Z",
  },
  {
    id: "p8",
    cardId: FAKE_CARD_ID,
    orderId: "o-1008",
    entity: "Pixelnestcloud",
    currency: "MXN",
    amount: "0.84",
    status: "completed",
    createdAt: "2023-12-11T15:17:00Z",
    updatedAt: "2023-12-11T15:17:00Z",
  },
];

export const executionsFake: DbExecution[] = [
  {
    id: "e1",
    paymentId: "p1",
    symbol: "MON",
    amount: "3750000000000000000", // 3.75 * 1e18
    decimals: 18,
    txHash: "0xhash1",
    createdAt: "2024-01-03T09:30:05Z",
    updatedAt: "2024-01-03T09:30:05Z",
  },
  {
    id: "e2",
    paymentId: "p2",
    symbol: "MON",
    amount: "120150000000000000000", // 120.15
    decimals: 18,
    txHash: "0xhash2",
    createdAt: "2023-11-28T12:05:05Z",
    updatedAt: "2023-11-28T12:05:05Z",
  },
  {
    id: "e3",
    paymentId: "p4",
    symbol: "MON",
    amount: "840000000000000000", // 0.84
    decimals: 18,
    txHash: "0xhash3",
    createdAt: "2023-12-13T01:45:05Z",
    updatedAt: "2023-12-13T01:45:05Z",
  },
  {
    id: "e4",
    paymentId: "p5",
    symbol: "MON",
    amount: "840000000000000000",
    decimals: 18,
    txHash: "0xhash4",
    createdAt: "2023-12-13T01:01:05Z",
    updatedAt: "2023-12-13T01:01:05Z",
  },
  {
    id: "e5",
    paymentId: "p6",
    symbol: "MON",
    amount: "840000000000000000",
    decimals: 18,
    txHash: "0xhash5",
    createdAt: "2023-12-11T15:40:05Z",
    updatedAt: "2023-12-11T15:40:05Z",
  },
  {
    id: "e6",
    paymentId: "p7",
    symbol: "MON",
    amount: "840000000000000000",
    decimals: 18,
    txHash: "0xhash6",
    createdAt: "2023-12-11T15:30:05Z",
    updatedAt: "2023-12-11T15:30:05Z",
  },
  {
    id: "e7",
    paymentId: "p8",
    symbol: "MON",
    amount: "840000000000000000",
    decimals: 18,
    txHash: "0xhash7",
    createdAt: "2023-12-11T15:17:05Z",
    updatedAt: "2023-12-11T15:17:05Z",
  },
];

export const virtualCardDisplay = {
  cardholderName: "Cat McGee",
  fullCardNumber: "4562112245957852",
  expiry: "12/2028",
  cvv: "210",
};

export const transfersFake: DbTransfer[] = [
  {
    id: "t1",
    userId: FAKE_USER_ID,
    symbol: "MON",
    amount: "1000000000000000000",
    decimals: 18,
    sender: "0x7cCFe1e5b8b6b3f3A9b6B0c6F3d2E1a0cFeE1234",
    receiver: "0x1111111111111111111111111111111111111111",
    txHash: "0xtxhash1",
    createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1)),
    updatedAt: iso(now),
  },
  {
    id: "t2",
    userId: FAKE_USER_ID,
    symbol: "MON",
    amount: "2500000000000000000",
    decimals: 18,
    sender: "0x2222222222222222222222222222222222222222",
    receiver: "0x7cCFe1e5b8b6b3f3A9b6B0c6F3d2E1a0cFeE1234",
    txHash: "0xtxhash2",
    createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
    updatedAt: iso(now),
  },
];

// Vaults fake data for UI (no DB schema change)
export const vaultsFake: UiVault[] = [
  {
    id: "v1",
    name: "Vacation",
    balanceUsd: 1000,
    goalUsd: 2000,
    changeUsd: 100,
    changePct: 0.02,
    history: [
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6)),
        valueUsd: 850,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5)),
        valueUsd: 900,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4)),
        valueUsd: 920,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3)),
        valueUsd: 960,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
        valueUsd: 980,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1)),
        valueUsd: 995,
      },
      { timestamp: iso(now), valueUsd: 1000 },
    ],
  },
  {
    id: "v2",
    name: "New Car",
    balanceUsd: 500,
    goalUsd: 10000,
    changeUsd: 50,
    changePct: 0.02,
    history: [
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6)),
        valueUsd: 400,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5)),
        valueUsd: 420,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4)),
        valueUsd: 430,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3)),
        valueUsd: 450,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
        valueUsd: 470,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1)),
        valueUsd: 490,
      },
      { timestamp: iso(now), valueUsd: 500 },
    ],
  },
  {
    id: "v3",
    name: "Emergency Fund",
    balanceUsd: 2000,
    goalUsd: 5000,
    changeUsd: 200,
    changePct: 0.025,
    history: [
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6)),
        valueUsd: 1700,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5)),
        valueUsd: 1750,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4)),
        valueUsd: 1800,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3)),
        valueUsd: 1850,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
        valueUsd: 1900,
      },
      {
        timestamp: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1)),
        valueUsd: 1950,
      },
      { timestamp: iso(now), valueUsd: 2000 },
    ],
  },
];

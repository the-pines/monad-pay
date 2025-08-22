import type { DbCard, DbUser, UiCardPublic, UiTransaction } from "./types";
import { dataSource } from "./datasource";
import {
  mapPaymentToUiTransaction,
  mapTransferToUiTransaction,
} from "./adapters";

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchCurrentUser(): Promise<DbUser> {
  return delay(await dataSource.getCurrentUser());
}

export async function fetchUserBalanceUSD(): Promise<number> {
  return delay(await dataSource.getUserBalanceUSD());
}

export async function fetchUserCard(): Promise<DbCard | undefined> {
  return delay(await dataSource.getUserCard());
}

export async function fetchUserTransactions(): Promise<UiTransaction[]> {
  const user = await dataSource.getCurrentUser();
  const payments = await dataSource.getUserPayments();
  const transfers = await dataSource.getUserTransfers();

  const paymentTxs = payments.map((p) => mapPaymentToUiTransaction(p));
  const transferTxs = transfers.map((t) =>
    mapTransferToUiTransaction(t, user.address)
  );

  const combined = [...paymentTxs, ...transferTxs].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );
  return delay(combined);
}

export async function fetchVirtualCardDisplay(): Promise<UiCardPublic> {
  return delay(await dataSource.getVirtualCardPublic());
}

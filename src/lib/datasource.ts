// todo hi ignacio this is a placeholder for the real datasource
// if you just fill this stuff right now with the data, everything should work. we might have some issues with currency conversion

import type {
  DbCard,
  DbPayment,
  DbTransfer,
  DbUser,
  UiCardPublic,
  UiVault,
} from "./types";
import {
  cardsFake,
  paymentsFake,
  transfersFake,
  usersFake,
  virtualCardDisplay,
} from "./fakeData";

export interface DataSource {
  getCurrentUser(): Promise<DbUser>;
  getUserBalanceUSD(): Promise<number>;
  getUserCard(): Promise<DbCard | undefined>;
  getUserPayments(): Promise<DbPayment[]>;
  getUserTransfers(): Promise<DbTransfer[]>;
  getVirtualCardPublic(): Promise<UiCardPublic>;
}

class FakeDataSource implements DataSource {
  async getCurrentUser(): Promise<DbUser> {
    return usersFake[0];
  }

  async getUserBalanceUSD(): Promise<number> {
    const user = await this.getCurrentUser();
    const base = Number.isFinite(user.balance) ? user.balance : 0;
    return Number((base * 0.85).toFixed(2));
  }

  async getUserCard(): Promise<DbCard | undefined> {
    const user = await this.getCurrentUser();
    return cardsFake.find((c) => c.userId === user.id);
  }

  async getUserPayments(): Promise<DbPayment[]> {
    const card = await this.getUserCard();
    return card ? paymentsFake.filter((p) => p.cardId === card.id) : [];
  }

  async getUserTransfers(): Promise<DbTransfer[]> {
    const user = await this.getCurrentUser();
    const current = user.address.toLowerCase();
    const excluded = process.env.NEXT_PUBLIC_MONADPAY_COMPANY_WALLET_ADDRESS;
    return transfersFake.filter((t) => {
      const sender = t.sender.toLowerCase();
      const receiver = t.receiver.toLowerCase();
      if (excluded && receiver === excluded) return false;
      return sender === current || receiver === current;
    });
  }

  async getVirtualCardPublic(): Promise<UiCardPublic> {
    return {
      cardholderName: virtualCardDisplay.cardholderName,
      cardNumber: virtualCardDisplay.fullCardNumber,
      expiry: virtualCardDisplay.expiry,
      cvv: virtualCardDisplay.cvv,
    };
  }
}

export const dataSource: DataSource = new FakeDataSource();

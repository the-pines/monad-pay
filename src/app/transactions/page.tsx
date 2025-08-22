export const metadata = { title: "Transactions" };

import { Transactions as TransactionsView } from "@/components/feature";

export default function TransactionsPage() {
  return (
    <div className="p-0">
      <TransactionsView />
    </div>
  );
}

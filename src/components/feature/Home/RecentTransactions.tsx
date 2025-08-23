import React from "react";
import Transaction from "@/components/ui/Transaction";
import { useUserTransactions } from "@/hooks";

export default function RecentTransactions() {
  const { data } = useUserTransactions();
  const latest3 = React.useMemo(() => {
    const items = data ?? [];
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      )
      .slice(0, 3);
  }, [data]);

  const formatTime = (date: Date): string =>
    new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-sm leading-6 font-medium tracking-wide text-[--foreground]/70">
        Recent transactions
      </h2>
      <div className="space-y-2">
        {latest3.map((t, idx) => {
          const d = new Date(t.datetime);
          return (
            <div
              key={t.id}
              className="motion-safe:animate-[slideIn_300ms_ease-out_forwards] opacity-0"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <Transaction
                title={t.title}
                time={formatTime(d)}
                note={t.note}
                amountPrimary={t.amountPrimary}
                amountUsd={t.amountUsd}
                direction={t.direction}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Transaction from "@/components/ui/Transaction";
import { useUserTransactions } from "@/hooks";
import type { UiTransaction } from "@/lib/types";

type GroupedDay = {
  dayKey: string; // YYYY-MM-DD
  dateLabel: string; // e.g. "13 dec. 2023"
  totalAmount: number;
  items: Array<UiTransaction>;
};

type GroupedMonth = {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "december 2023"
  days: Array<GroupedDay>;
};

function toMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthLabel(date: Date): string {
  const label = date.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label;
}

function formatDayLabel(date: Date): string {
  const label = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.toLocaleLowerCase();
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

function groupTransactionsByMonthAndDay(
  transactions: UiTransaction[]
): GroupedMonth[] {
  const byMonth: Record<string, { date: Date; items: UiTransaction[] }> = {};

  for (const tx of transactions) {
    const date = new Date(tx.datetime);
    const mk = toMonthKey(date);
    if (!byMonth[mk]) {
      byMonth[mk] = {
        date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
        items: [],
      };
    }
    byMonth[mk].items.push(tx);
  }

  const months = Object.entries(byMonth)
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([monthKey, { date, items }]) => {
      const byDay: Record<string, { date: Date; items: UiTransaction[] }> = {};
      for (const tx of items) {
        const d = new Date(tx.datetime);
        const dk = toDayKey(d);
        if (!byDay[dk]) {
          byDay[dk] = {
            date: new Date(
              Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
            ),
            items: [],
          };
        }
        byDay[dk].items.push(tx);
      }

      const days: GroupedDay[] = Object.entries(byDay)
        .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
        .map(([dayKey, group]) => {
          const total = group.items.reduce(
            (acc, t) => acc + t.amountPrimary,
            0
          );
          // sort items by most recent time
          const sortedItems = [...group.items].sort(
            (a, b) =>
              new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
          );
          return {
            dayKey,
            dateLabel: formatDayLabel(group.date),
            totalAmount: total,
            items: sortedItems,
          };
        });

      return {
        monthKey,
        monthLabel: formatMonthLabel(date),
        days,
      };
    });

  return months;
}

export default function Transactions() {
  const [selectedMonthKey, setSelectedMonthKey] = React.useState<string | null>(
    null
  );
  const monthsScrollRef = React.useRef<HTMLDivElement | null>(null);

  const { data } = useUserTransactions();
  const grouped = React.useMemo(
    () => groupTransactionsByMonthAndDay(data ?? []),
    [data]
  );

  React.useEffect(() => {
    if (!selectedMonthKey && grouped.length > 0) {
      setSelectedMonthKey(grouped[grouped.length - 1].monthKey);
    }
  }, [grouped, selectedMonthKey]);

  // Ensure the horizontal month selector is scrolled to the end (latest)
  React.useEffect(() => {
    const el = monthsScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "auto" });
  }, [grouped.length, selectedMonthKey]);

  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const selectedMonth =
    grouped.find((m) => m.monthKey === selectedMonthKey) ??
    grouped[grouped.length - 1];

  return (
    <section className="px-4 py-2">
      <h1 className="text-xl font-semibold mb-4">Transactions</h1>
      {/* Month selector */}
      <div className="sticky top-[104px] z-10 -mx-4 bg-[--background]">
        <div
          ref={monthsScrollRef}
          className="px-4 py-3 flex items-center gap-3 overflow-x-auto"
        >
          {grouped.map((m) => (
            <button
              key={m.monthKey}
              type="button"
              onClick={() => setSelectedMonthKey(m.monthKey)}
              className={
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
                (m.monthKey === selectedMonthKey
                  ? "bg-white/15 text-[--foreground]"
                  : "text-[--foreground]/70 hover:text-[--foreground]")
              }
            >
              {m.monthLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="max-h-[calc(100dvh-180px)] overflow-y-auto pb-8">
        {selectedMonth?.days.map((group) => (
          <div key={group.dayKey} className="mt-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[13px] tracking-wide uppercase text-[--foreground]/60">
                {group.dateLabel}
              </h3>
              <span className="text-[13px] text-[--foreground]/60">
                {`MXN ${formatNumber(group.totalAmount)}`}
              </span>
            </div>

            <div className="space-y-2">
              {group.items.map((t) => {
                const d = new Date(t.datetime);
                return (
                  <Transaction
                    key={t.id}
                    title={t.title}
                    time={formatTime(d)}
                    note={t.note}
                    amountPrimary={t.amountPrimary}
                    amountUsd={t.amountUsd}
                    direction={t.direction}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

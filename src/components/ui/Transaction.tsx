import React from "react";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";

export type TransactionProps = {
  title: string;
  time: string;
  note?: string;
  amountPrimary: number;
  amountUsd?: number;
  direction: "in" | "out";
  onClick?: () => void;
};

export default function Transaction({
  title,
  time,
  note,
  amountPrimary,
  amountUsd,
  direction,
  onClick,
}: TransactionProps) {
  const Icon = direction === "in" ? ArrowDownLeftIcon : ArrowUpRightIcon;

  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const accentBg = direction === "in" ? "bg-[#1DE9B6]/25" : "bg-[#FF5CAA]/25"; // turquoise / pink with slight opacity
  const accentIcon = direction === "in" ? "text-[#1DE9B6]" : "text-[#FF5CAA]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors px-4 py-3 flex items-center gap-3 soft-shadow`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accentBg}`}
      >
        <Icon className={`h-6 w-6 ${accentIcon}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-[15px] leading-5 text-[--foreground]">
          {title}
        </div>
        <div className="mt-0.5 text-xs text-[--foreground]/70">
          <span>{time}</span>
          {note ? <span> · {note}</span> : null}
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold text-[15px] leading-5 text-[--foreground]">
          {`MXN ${formatNumber(amountPrimary)}`}
        </div>
        {amountUsd !== undefined ? (
          <div className="mt-0.5 text-xs text-[--foreground]/70">
            {`${formatNumber(amountUsd)} USD`}
          </div>
        ) : null}
      </div>
    </button>
  );
}

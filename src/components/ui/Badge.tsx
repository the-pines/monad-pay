import React from "react";

export type BadgeProps = {
  children: React.ReactNode;
  intent?: "neutral" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md";
  className?: string;
};

const intentMap: Record<NonNullable<BadgeProps["intent"]>, string> = {
  neutral: "bg-white/10 text-white/80",
  success: "bg-[#1DE9B6]/20 text-[#1DE9B6]",
  danger: "bg-[#FF5CAA]/20 text-[#FF5CAA]",
  warning: "bg-yellow-400/20 text-yellow-300",
  info: "bg-blue-400/20 text-blue-300",
};

const sizeMap: Record<NonNullable<BadgeProps["size"]>, string> = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export default function Badge({
  children,
  intent = "neutral",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-medium",
        intentMap[intent],
        sizeMap[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

import React from "react";

export type CardProps = {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  onClick?: () => void;
};

const paddingClassMap: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  as = "div",
  className,
  children,
  padding = "md",
  interactive = false,
  onClick,
}: CardProps) {
  const Component = as as React.ElementType;
  const base =
    "rounded-3xl soft-shadow border transition-colors interactive-gradient";
  const surface = " bg-[var(--card-surface)] border-[var(--card-border)]";
  const hover = interactive
    ? " hover:bg-[var(--card-surface-hover)] active:bg-[var(--card-surface-active)]"
    : "";
  const paddingClass = paddingClassMap[padding];

  return (
    <Component
      className={[base, surface, hover, paddingClass, className]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

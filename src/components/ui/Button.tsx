import React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

const sizeMap: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-bold rounded-2xl transition-colors whitespace-nowrap select-none interactive-gradient";
  const sizes = sizeMap[size];

  const variants: Record<string, string> = {
    primary:
      "text-white bg-[linear-gradient(135deg,#A78BFA_0%,#7C5CFF_50%,#5B3CF3_100%)] shadow-sm",
    secondary:
      "text-white/90 bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10",
    ghost: "text-white/80 hover:bg-white/10",
  };

  return (
    <button
      type="button"
      className={[
        base,
        sizes,
        variants[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

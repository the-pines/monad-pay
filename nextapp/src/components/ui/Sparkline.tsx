import React from "react";

export type SparklineProps = {
  points: number[]; // normalized [0..1] or raw; we will auto-scale
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  fillGradient?: boolean;
};

export default function Sparkline({
  points,
  width = 120,
  height = 36,
  stroke = "#A78BFA",
  strokeWidth = 2,
  className,
  fillGradient = true,
}: SparklineProps) {
  const gradientId = React.useId();
  if (!points || points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const path = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const fillPath = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="sparkline"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {fillGradient ? <path d={fillPath} fill={`url(#${gradientId})`} /> : null}
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

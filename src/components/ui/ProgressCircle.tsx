"use client";

import React from "react";

export type ProgressCircleProps = {
  value: number; // 0..1
  size?: number; // px
  thickness?: number; // px of ring
  label?: string; // optional center label
  className?: string;
  color?: string; // CSS color for progress
  showPercent?: boolean;
};

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  value,
  size = 128,
  thickness = 14,
  label,
  className,
  showPercent = true,
}) => {
  const clamped = Math.max(0, Math.min(1, value || 0));
  const [animated, setAnimated] = React.useState(0);

  React.useEffect(() => {
    // animate from current animated to clamped
    const start = performance.now();
    const from = animated;
    const to = clamped;
    const duration = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      const current = from + (to - from) * eased;
      setAnimated(current);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  // Mask to cut a donut shape out of a filled circle
  const ringMask = `radial-gradient(closest-side, transparent calc(50% - ${thickness}px), black calc(50% - ${
    thickness - 1
  }px))`;

  return (
    <div
      className={"relative inline-grid place-items-center " + (className || "")}
      style={{
        width: size,
        height: size,
      }}
      aria-label={label || "progress"}
    >
      {/* Track */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))",
          mask: ringMask,
          WebkitMask: ringMask,
          opacity: 0.6,
        }}
      />

      {/* Progress arc */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, var(--pc-start, #7C5CFF) 0turn, var(--pc-end, #CBBDFE) " +
            animated +
            "turn, transparent " +
            animated +
            "turn)",
          mask: ringMask,
          WebkitMask: ringMask,
          filter: "drop-shadow(0 4px 18px rgba(143,124,255,.35))",
        }}
      />

      {/* Center label */}
      {(label !== undefined || showPercent) && (
        <div className="relative z-10 text-center select-none">
          <div className="display text-sm font-semibold tabular-nums">
            {label !== undefined ? label : `${Math.round(clamped * 100)}%`}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressCircle;

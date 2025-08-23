"use client";

import React from "react";

export type ProgressCircleProps = {
  value: number; // 0..1
  size?: number; // px
  thickness?: number; // px of ring
  label?: string; // optional center label
  className?: string;
};

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  value,
  size = 128,
  thickness = 14,
  label,
  className,
}) => {
  const clamped = Math.max(0, Math.min(1, value || 0));

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
            "conic-gradient(from 0deg, #8f7cff 0turn, #cbbdff " +
            clamped +
            "turn, transparent " +
            clamped +
            "turn)",
          mask: ringMask,
          WebkitMask: ringMask,
          filter: "drop-shadow(0 4px 18px rgba(143,124,255,.35))",
        }}
      />
    </div>
  );
};

export default ProgressCircle;

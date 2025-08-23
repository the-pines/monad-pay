"use client";

import React from "react";

export type ProgressCircleProps = {
  value: number; // 0..1
  size?: number; // px
  thickness?: number; // px of ring
  label?: string; // optional center label
  className?: string;
};

// A visually rich progress circle using conic gradients with a subtle rotating glisten
const ProgressCircle: React.FC<ProgressCircleProps> = ({
  value,
  size = 128,
  thickness = 14,
  label,
  className,
}) => {
  const clamped = Math.max(0, Math.min(1, value || 0));
  const ringMask = `radial-gradient(closest-side, transparent calc(50% - ${thickness}px), black calc(50% - ${
    thickness - 1
  }px))`;

  return (
    <div
      className={"relative inline-grid place-items-center " + (className || "")}
      style={{ width: size, height: size }}
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

      {/* Progress with rich gradient */}
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

      {/* Rotating glisten layer */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,.28) 20deg, rgba(255,255,255,0) 40deg, rgba(255,255,255,0) 360deg)",
          mixBlendMode: "screen",
          mask: ringMask,
          WebkitMask: ringMask,
          animation: "pc-rotate 2.4s linear infinite",
          opacity: 0.9,
        }}
        aria-hidden
      />

      {/* Center */}
      <div className="relative z-10 text-sm font-semibold text-[#FBFAF9]">
        {label}
      </div>

      <style jsx>{`
        @keyframes pc-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressCircle;

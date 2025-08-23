"use client";

import React from "react";
import { useToastContext } from "@/contexts/ToastContext";

const intentClass: Record<string, string> = {
  neutral: "bg-white/10 text-white",
  success: "bg-[#1DE9B6]/20 text-white",
  danger: "bg-[#FF5CAA]/20 text-white",
  warning: "bg-yellow-400/20 text-white",
  info: "bg-blue-400/20 text-white",
};

export default function Toaster() {
  const { toasts, dismiss } = useToastContext();
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center gap-2 p-4">
      <div className="mt-12 w-full max-w-[393px] flex flex-col items-stretch gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl px-4 py-3 soft-shadow border border-white/10 backdrop-blur-sm ${
              intentClass[t.intent ?? "neutral"]
            }`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {t.title ? (
                  <div className="font-semibold text-sm leading-5">
                    {t.title}
                  </div>
                ) : null}
                {t.description ? (
                  <div className="text-xs opacity-80 mt-0.5">
                    {t.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-xl px-2 py-1 text-xs bg-white/10 hover:bg-white/15"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

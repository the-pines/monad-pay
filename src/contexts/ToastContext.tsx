"use client";

import React from "react";

export type ToastIntent = "neutral" | "success" | "danger" | "warning" | "info";

export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  intent?: ToastIntent;
  durationMs?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((items) => items.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const item: ToastItem = {
        id,
        intent: t.intent ?? "neutral",
        durationMs: t.durationMs ?? 2500,
        title: t.title,
        description: t.description,
      };
      setToasts((items) => [...items, item]);
      if (item.durationMs && item.durationMs > 0) {
        window.setTimeout(() => dismiss(id), item.durationMs);
      }
      return id;
    },
    [dismiss]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export function useToastContext(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx)
    throw new Error("useToastContext must be used within ToastProvider");
  return ctx;
}

// ignacio here is login hook
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  isLoggedIn: boolean;
  address: string | null;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "monadpay_wallet_address";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      if (saved) setAddress(saved);
    } catch {}
  }, []);

  const login = () => {
    // Fake wallet address
    const fakeAddress = "0x9c7e45bff3a4e2c19a6d0ea5b7c81234abcd5678";
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, fakeAddress);
      }
    } catch {}
    setAddress(fakeAddress);
  };

  const logout = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    setAddress(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ isLoggedIn: Boolean(address), address, login, logout }),
    [address]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

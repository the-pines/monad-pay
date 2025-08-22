"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Header, NavigationFooter } from ".";
import LoginScreen from "@/components/feature/Auth/LoginScreen";

function Inner({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <>
      <Header />
      <main className="relative mx-auto max-w-[393px] w-full pt-[104px] pb-[calc(56px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <NavigationFooter />
    </>
  );
}

export default function AuthRoot({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Inner>{children}</Inner>
    </AuthProvider>
  );
}

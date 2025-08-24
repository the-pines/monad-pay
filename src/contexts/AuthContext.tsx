// soz babe changed very slightly because it was breaking vaults
"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (isConnected) return;
    const onAuthRoute =
      pathname === "/login" ||
      pathname?.startsWith("/login/") ||
      pathname === "/signup" ||
      pathname?.startsWith("/signup/");
    if (onAuthRoute) return;
    if (
      typeof document !== "undefined" &&
      document.cookie.includes("wagmi.store=")
    )
      return;
    const id = window.setTimeout(() => {
      if (!isConnected) router.replace("/login");
    }, 250);
    return () => window.clearTimeout(id);
  }, [isConnected, pathname, router]);

  return <>{children}</>;
};

export default AuthProvider;

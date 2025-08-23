"use client";

import { useAppKitAccount } from "@reown/appkit/react";

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Middleware enforces auth and onboarding. Avoid client-side redirects here
  // to prevent race conditions during route transitions.
  // Keep hook to ensure provider re-renders on connection changes if needed.
  useAppKitAccount();
  return <>{children}</>;
};

export default AuthProvider;

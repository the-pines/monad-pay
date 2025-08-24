"use client";

import { Header, Navigation } from "@/components/layout";
import AuthProvider from "@/contexts/AuthContext";
import PageTransition from "@/app/page-transition";
import { UserProvider } from "@/contexts/UserContext";

export default function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />

      <main className='relative mx-auto max-w-[393px] w-full pt-[104px] pb-[calc(56px+env(safe-area-inset-bottom))]'>
        <AuthProvider>
          <PageTransition>
            <UserProvider>{children}</UserProvider>
          </PageTransition>
        </AuthProvider>
      </main>

      <Navigation />
    </>
  );
}

import { Header, Navigation } from '@/components/layout';
import AuthContext from '@/contexts/AuthContext';

export default function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />

      <main className="relative mx-auto max-w-[393px] w-full pt-[104px] pb-[calc(56px+env(safe-area-inset-bottom))]">
        <AuthContext>{children}</AuthContext>
      </main>

      <Navigation />
    </>
  );
}

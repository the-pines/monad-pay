import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import './globals.css';

import { Header, NavigationFooter } from '@/components/layout';
import ContextProvider from '@/contexts';

const inter = Inter({
  variable: '--font-inter-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Monay Pay',
  description: 'enirehtac em yrram',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');

  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ContextProvider cookies={cookies}>
          <Header />

          <main className="relative mx-auto max-w-[393px] w-full pt-[104px] pb-[calc(56px+env(safe-area-inset-bottom))]">
            {children}
          </main>

          <NavigationFooter />
        </ContextProvider>
      </body>
    </html>
  );
}

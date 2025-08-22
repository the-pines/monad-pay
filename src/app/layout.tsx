import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import './globals.css';

import WalletContext from '@/contexts/WalletContext';

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
        <WalletContext cookies={cookies}>{children}</WalletContext>
      </body>
    </html>
  );
}

import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";

import WalletProvider from "@/contexts/WalletContext";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

import localFont from "next/font/local";

const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/satoshi/Satoshi-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi/Satoshi-VariableItalic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monad Pay",
  description: "enirehtac em yrram",
  icons: {
    icon: [
      { url: "/assets/favicon.ico", rel: "icon", type: "image/x-icon" },
      {
        url: "/assets/favicon.ico",
        rel: "shortcut icon",
        type: "image/x-icon",
      },
    ],
    apple: [{ url: "/assets/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang='en'>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${satoshi.variable} antialiased`}
      >
        <WalletProvider cookies={cookies}>{children}</WalletProvider>
      </body>
    </html>
  );
}

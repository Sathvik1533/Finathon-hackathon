import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LedgerSense", template: "%s | LedgerSense" },
  description: "Financial reconciliation platform — deterministic first, AI second.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} h-full bg-zinc-950 text-zinc-100 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

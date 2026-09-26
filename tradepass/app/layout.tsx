import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TradePass",
  description: "Verified experience for skilled trades",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${jetbrainsMono.variable} antialiased bg-slate-100 text-slate-900`}>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="font-serif text-2xl font-semibold tracking-tight text-slate-900">TradePass</span>
              <span className="hidden text-sm text-slate-500 sm:inline">Verified experience for skilled trades</span>
            </Link>
            <nav className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-slate-500">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">309A · Electrician</span>
            </nav>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-73px)] max-w-5xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

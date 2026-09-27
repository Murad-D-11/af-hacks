import type { Metadata } from "next";
import { Big_Shoulders_Stencil_Display, Martian_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const bigShoulders = Big_Shoulders_Stencil_Display({
  subsets: ["latin"],
  variable: "--font-stamp",
  weight: ["500", "600", "700", "800", "900"],
});
const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-ledger",
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
      <body className={`${bigShoulders.variable} ${martianMono.variable} antialiased text-foreground`}>
        <header className="relative border-b-2 border-orange bg-plate">
          {/* EN: A repeating diagonal hazard stripe sits behind the wordmark, like
              tape along the edge of a site office window — cropped by overflow so
              it reads as a texture, not a banner. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, var(--orange) 0px, var(--orange) 10px, transparent 10px, transparent 20px)',
            }}
          />
          <div className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="group flex items-baseline gap-3">
              <span className="font-stamp text-3xl font-bold uppercase tracking-wide text-foreground">
                Trade<span className="text-orange">Pass</span>
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.2em] text-foreground/40 sm:inline">
                Verified Experience Ledger
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-foreground/50">
              <span className="border border-orange/50 bg-orange/10 px-2.5 py-1 text-orange">
                Skilled Trades
              </span>
            </nav>
          </div>
        </header>
        <main className="animate-rise-in mx-auto min-h-[calc(100vh-73px)] max-w-5xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

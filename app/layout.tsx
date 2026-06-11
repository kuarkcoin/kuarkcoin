import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KuarkCoin Signals",
    template: "%s | KuarkCoin Signals",
  },
  description:
    "English-first dashboard for educational stock and ETF signals, market insights, and watchlist tracking.",
  applicationName: "KuarkCoin Signals",
  keywords: ["stock signals", "ETF signals", "market dashboard", "watchlist", "educational investing"],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#05070a] text-white antialiased">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/10 bg-[#05070a]/95 px-4 py-5 text-sm text-gray-400">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>Not financial advice. Signals are for educational and informational purposes only.</p>
              <Link className="font-medium text-gray-200 underline-offset-4 hover:text-white hover:underline" href="/disclaimer">
                Disclaimer
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

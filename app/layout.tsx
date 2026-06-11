import type { Metadata } from "next";
import "./globals.css";
import Disclaimer from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "EnglishMeter",
  description: "KUARK Terminal + EnglishMeter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        {children}
        <footer className="border-t border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Disclaimer />
            <a href="/disclaimer" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Full disclaimer
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kuarkcoin.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Kuarkcoin",
  title: { default: "Kuarkcoin Finans Terminali", template: "%s | Kuarkcoin" },
  description: "Kuarkcoin; piyasa sinyalleri, haber akışı, finansal kalite verileri ve AI destekli özetler sunan finans terminalidir.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Kuarkcoin", title: "Kuarkcoin Finans Terminali", description: "Sinyal, haber ve finansal kalite panelleriyle modern finans terminali." },
  twitter: { card: "summary_large_image", title: "Kuarkcoin Finans Terminali", description: "Sinyal, haber ve finansal kalite panelleri." },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body className="min-h-screen bg-slate-950 text-slate-100"><div className="min-h-screen">{children}</div><Footer /></body></html>;
}

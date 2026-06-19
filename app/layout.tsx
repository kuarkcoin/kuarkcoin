import type { Metadata } from "next";
import { getAppUrl } from "./metadata";
import "./globals.css";

const appUrl = getAppUrl();
const title = "Kuarkcoin";
const description =
  "Kuarkcoin, piyasa haberleri, finansal veriler ve sinyalleri tek ekranda takip etmeye yardımcı olur; sinyaller yatırım tavsiyesi değildir.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: appUrl,
  openGraph: {
    title,
    description,
    url: appUrl,
    siteName: "Kuarkcoin",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

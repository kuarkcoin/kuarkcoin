import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

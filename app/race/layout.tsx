import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global English Race Arena | Live Competition",
  description: "Compete with other English learners in real-time. Answer grammar and vocabulary questions correctly to win the race.",
  keywords: ["Multiplayer English game", "Live quiz race", "Grammar competition", "EnglishMeter race", "Online exam battle"],
  openGraph: {
    title: "Global English Race 🏆",
    description: "Join the arena and race against others with your English skills.",
    type: "website",
  },
};

export default function RaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Rekabetçi, koyu gri/mavi tonlar
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {children}
    </div>
  );
}

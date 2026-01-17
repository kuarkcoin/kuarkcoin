import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phrasal Verbs Puzzle Game | Match & Learn",
  description: "A fun way to learn phrasal verbs. Match the verbs with their correct particles and meanings. Essential for mastering advanced English.",
  keywords: ["Phrasal verbs game", "English puzzle", "Verb particles", "YDS phrasal verbs", "Fun English learning"],
  openGraph: {
    title: "Phrasal Verbs Puzzle 🧩",
    description: "Crack the code of English phrasal verbs with this puzzle game.",
    type: "website",
  },
};

export default function PhrasalPuzzleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Eğlenceli, canlı renkler (Fuchsia/Mor)
  return (
    <div className="min-h-screen bg-fuchsia-950 text-white">
      {children}
    </div>
  );
}

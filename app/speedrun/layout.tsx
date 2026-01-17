import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpeedRun Vocabulary Challenge | EnglishMeter",
  description: "Race against the clock! You have 120 seconds to guess as many English words as possible. Test your reflexes and vocabulary size.",
  keywords: ["Speedrun game", "English vocabulary test", "Fast paced word game", "YDS speed test", "EnglishMeter game"],
  openGraph: {
    title: "English Vocabulary SpeedRun ⚡",
    description: "Can you beat the clock? Test your English speed now.",
    type: "website",
  },
};

export default function SpeedRunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Oyunun atmosferine uygun koyu/enerjik bir arka plan
  return (
    <div className="min-h-screen bg-indigo-950 text-white selection:bg-yellow-500 selection:text-black">
      {children}
    </div>
  );
}

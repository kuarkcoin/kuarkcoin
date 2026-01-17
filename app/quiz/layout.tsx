import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "English Practice Test | EnglishMeter",
  description: "Taking an online English test. Focus on your questions and get your instant score.",
  robots: {
    index: false, // Test çözme ekranının kendisinin Google'da çıkmasına gerek yok, sonuçlar çıksın.
    follow: false,
  },
};

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dikkati dağıtmayan, temiz beyaz/gri arka plan
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      {children}
    </div>
  );
}

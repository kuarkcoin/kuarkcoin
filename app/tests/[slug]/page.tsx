// app/tests/[slug]/page.tsx
import type { Metadata } from 'next';
import { getQuestionsBySlug } from '@/lib/quizManager';
import RaceQuiz from '@/components/RaceQuiz';

type PageProps = { params: { slug: string } };

// RaceQuiz'in beklediği format
type RaceQuestion = {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
};

function toRaceQuestions(
  data: ReturnType<typeof getQuestionsBySlug>
): RaceQuestion[] {
  return (data.questions || []).map((q, idx) => {
    // 4 şık garanti olsun
    const c = (q.choices || []).slice(0, 4);
    const safe = (i: number) => c[i]?.text ?? '';

    // doğru şık id'sini bul (a/b/c/d)
    const correct = (c.find((x) => x.isCorrect)?.id ?? 'a') as
      | 'a'
      | 'b'
      | 'c'
      | 'd';

    return {
      id: idx + 1,
      question_text: q.prompt ?? 'Question missing',
      option_a: safe(0),
      option_b: safe(1),
      option_c: safe(2),
      option_d: safe(3),
      correct_option: correct,
    };
  });
}

export function generateMetadata({ params }: PageProps): Metadata {
  const data = getQuestionsBySlug(params.slug);
  const qCount = data?.questions?.length ?? 0;

  return {
    title: data?.title ? `${data.title} | EnglishMeter` : 'Test | EnglishMeter',
    description:
      qCount > 0
        ? `${qCount} soruluk ${data.title} testini çöz. Ücretsiz online İngilizce testi.`
        : 'Ücretsiz online İngilizce testleri.',
    alternates: { canonical: `/tests/${params.slug}` },
  };
}

export default function TestPage({ params }: PageProps) {
  const testData = getQuestionsBySlug(params.slug);

  if (!testData?.questions?.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl bg-white shadow p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Test bulunamadı</h1>
          <p className="mt-2 text-slate-600">
            Bu slug ile eşleşen bir test yok: <span className="font-mono">{params.slug}</span>
          </p>
        </div>
      </div>
    );
  }

  const raceQuestions = toRaceQuestions(testData);

  // RaceQuiz saniye bekliyor
  const totalTimeSeconds = Math.max(60, (testData.duration || 15) * 60);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ✅ Google bot için görünür metin */}
      <div className="sr-only">
        <h1>{testData.title}</h1>
        <p>
          {raceQuestions.length} soruluk {testData.title} testini çözün. Süre {testData.duration} dakikadır.
        </p>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
          {testData.title}
        </h1>

        <RaceQuiz
          questions={raceQuestions}
          raceId={params.slug}   // slug'ı raceId gibi kullanıyoruz
          totalTime={totalTimeSeconds}
        />

        {/* Footer sende varsa burada kullanabilirsin:
            <Footer />
        */}
      </div>
    </div>
  );
}
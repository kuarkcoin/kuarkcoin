// components/RaceQuiz.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string; // 'a' | 'b' | 'c' | 'd'
}

interface RaceQuizProps {
  questions: Question[];
  raceId: string;     // ✅ artık slug da gelebilir
  totalTime: number;  // seconds
}

export default function RaceQuiz({ questions, raceId, totalTime }: RaceQuizProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Geri Sayım Sayacı
  useEffect(() => {
    if (timeLeft <= 0 && !isFinished) {
      handleFinish();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isFinished) handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isFinished]);

  // Şık Seçme
  const handleOptionSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
  };

  // Sınavı Bitirme
  const handleFinish = async () => {
    if (isSubmitting || isFinished) return;

    setIsSubmitting(true);
    setIsFinished(true);

    // Skor hesapla
    let score = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correct_option) score++;
    });

    const timeSpent = totalTime - timeLeft;

    // Kullanıcı adı al
    let nickname = '';
    if (typeof window !== 'undefined') {
      nickname =
        window.prompt(
          `🏁 ${timeLeft <= 0 ? "TIME'S UP!" : "EXAM FINISHED!"}\n\nScore: ${score}/${questions.length}\nTime: ${Math.floor(
            timeSpent / 60
          )}m ${timeSpent % 60}s\n\nEnter your nickname for the Global Leaderboard:`
        ) || '';
    }

    if (!nickname || nickname.trim() === '') {
      nickname = `Guest-${Math.floor(Math.random() * 10000)}`;
    }

    try {
      // LOCAL STORAGE'A KAYDET
      const result = {
        username: nickname.trim(),
        race_id: raceId, // ✅ STRING olarak saklıyoruz (slug destekler)
        score,
        time_seconds: timeSpent,
        timestamp: new Date().toISOString(),
      };

      const existingResults = JSON.parse(localStorage.getItem('race_results') || '[]');
      const updatedResults = [...existingResults, result];
      localStorage.setItem('race_results', JSON.stringify(updatedResults));

      router.push(
        `/race/${raceId}/result?score=${score}&time=${timeSpent}&user=${encodeURIComponent(nickname.trim())}`
      );
    } catch (err) {
      console.error('Error saving result:', err);
      router.push(
        `/race/${raceId}/result?score=${score}&time=${timeSpent}&user=${encodeURIComponent(nickname.trim())}`
      );
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">No Questions Available</h2>
        <p className="text-gray-600">Please check the questions data file.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  if (isFinished) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="text-xl font-bold text-blue-600 animate-pulse mb-4">
          Calculating Results... 🚀
        </div>
        <p className="text-gray-600">Please wait while we save your score...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Üst Bilgi */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="font-bold text-lg">
          Question {currentIndex + 1} / {questions.length}
        </div>
        <div
          className={`font-mono text-xl font-bold ${
            timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-blue-300'
          }`}
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* İlerleme Çubuğu */}
      <div className="w-full bg-gray-200 h-2">
        <div className="bg-blue-600 h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Soru Alanı */}
      <div className="p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
          {currentQuestion.question_text}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {(['a', 'b', 'c', 'd'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => handleOptionSelect(opt)}
              disabled={isSubmitting}
              className={`
                text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4
                ${answers[currentIndex] === opt ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0
                  ${answers[currentIndex] === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}
                `}
              >
                {opt.toUpperCase()}
              </div>
              <div className="text-lg font-medium text-gray-700 text-left">
                {currentQuestion[`option_${opt}` as const]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Alt Butonlar */}
      <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0 || isSubmitting}
          className="px-6 py-3 text-gray-600 font-bold hover:text-gray-900 disabled:opacity-30 rounded-lg transition"
        >
          ← Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={handleFinish}
            disabled={isSubmitting}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? 'Submitting...' : 'FINISH EXAM ✅'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
}
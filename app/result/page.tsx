'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ResultQuestion = {
  id: string;
  prompt: string;
  selectedId?: string;
  choices: {
    id: string;
    text: string;
    isCorrect?: boolean;
    selected?: boolean;
  }[];
};

type ResultPayload = {
  attemptId: string;
  testTitle: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  scorePercent: number;
  questions: ResultQuestion[];
};

export default function ResultPage() {
  const [result, setResult] = useState<ResultPayload | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('em_last_result');
    if (!raw) return;
    try {
      setResult(JSON.parse(raw));
    } catch (e) {
      console.error('Result parse error', e);
    }
  }, []);

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-slate-600 mb-4">
          Result not found. Please start a new test from the homepage.
        </p>
        <Link
          href="/"
          className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* Özet Kartı */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-2">
          Test Result
        </div>
        <div className="text-2xl font-bold text-slate-900 mb-4">
          {result.testTitle}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs uppercase text-slate-400">Score</div>
            <div className="text-xl font-bold text-slate-800">
              {result.correctCount} / {result.totalQuestions}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">Correct</div>
            <div className="text-xl font-bold text-emerald-600">
              {result.correctCount}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">Wrong</div>
            <div className="text-xl font-bold text-rose-600">
              {result.wrongCount}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">Percent</div>
            <div className="text-xl font-bold text-blue-600">
              {result.scorePercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Soruların Detayı (istersen sonra sadeleştirirsin) */}
      <div className="space-y-6">
        {result.questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white p-5 rounded-2xl border border-slate-200"
          >
            <div className="text-sm text-slate-400 mb-2 font-semibold">
              Question {idx + 1}
            </div>
            <div
              className="text-lg font-medium text-slate-800 mb-4"
              dangerouslySetInnerHTML={{ __html: q.prompt }}
            />

            <div className="space-y-2">
              {q.choices.map((c) => {
                const isCorrect = !!c.isCorrect;
                const isSelected = !!c.selected;

                let border = 'border-slate-200';
                let bg = 'bg-white';
                let text = 'text-slate-700';

                if (isCorrect) {
                  border = 'border-emerald-500';
                  bg = 'bg-emerald-50';
                  text = 'text-emerald-800';
                }
                if (isSelected && !isCorrect) {
                  border = 'border-rose-500';
                  bg = 'bg-rose-50';
                  text = 'text-rose-800';
                }

                return (
                  <div
                    key={c.id}
                    className={`px-4 py-3 rounded-xl border ${border} ${bg} ${text} text-sm flex items-center justify-between`}
                  >
                    <span>{c.text}</span>
                    <span className="text-xs font-semibold uppercase">
                      {isCorrect
                        ? 'Correct Answer'
                        : isSelected
                        ? 'Your Answer'
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 pb-12 flex justify-center">
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
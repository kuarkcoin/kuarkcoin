"use client";
import React, { useState, useEffect } from 'react';

interface QuizProps {
  word: string;
  correctMeaning: string;
  allMeanings: string[];
}

export default function VocabularyQuiz({ word, correctMeaning, allMeanings }: QuizProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    // 3 tane rastgele yanlış cevap seç
    const distractors = allMeanings
      .filter(m => m !== correctMeaning)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Doğru cevapla karıştır
    const shuffled = [...distractors, correctMeaning].sort(() => 0.5 - Math.random());
    setOptions(shuffled);
  }, [word]);

  const handleCheck = (option: string) => {
    if (selected) return; // Zaten seçilmişse durdur
    setSelected(option);
    setIsCorrect(option === correctMeaning);
  };

  return (
    <section className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
        <span className="bg-amber-400 text-xs px-2 py-1 rounded-lg uppercase">Mini Test</span>
        Anlamını Hatırlıyor musun?
      </h3>
      
      <p className="text-slate-600 mb-6">
        <strong className="text-blue-600">"{word}"</strong> kelimesinin doğru Türkçe karşılığı hangisidir?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleCheck(option)}
            disabled={selected !== null}
            className={`p-4 text-left rounded-2xl font-bold transition-all border-2 ${
              selected === option
                ? isCorrect
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-rose-50 border-rose-500 text-rose-700"
                : selected !== null && option === correctMeaning
                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                : "bg-slate-50 border-slate-100 text-slate-700 hover:border-blue-300"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <div className={`mt-6 p-4 rounded-2xl font-bold text-center animate-bounce ${
          isCorrect ? "bg-emerald-500 text-white" : "bg-slate-800 text-white"
        }`}>
          {isCorrect ? "🎉 Tebrikler! Doğru cevap." : `❌ Maalesef. Doğru cevap: ${correctMeaning}`}
        </div>
      )}
    </section>
  );
}

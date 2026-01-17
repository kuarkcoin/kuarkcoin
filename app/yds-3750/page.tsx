// app/yds-3750/page.tsx
'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import ydsVocabulary from '@/data/yds_vocabulary.json';

type VocabItem = {
  word: string;
  meaning: string;
  // ✅ AI fields (enriched json’dan gelirse)
  s?: string | null;
  t?: string | null;
};

type Choice = { id: string; text: string; isCorrect: boolean };

type Question = {
  id: string;
  prompt: string;
  choices: Choice[];
  explanation?: string;
  // ✅ quiz page bekliyor
  s?: string | null;
  t?: string | null;
};

const TEST_COUNT = 100;
const QUESTIONS_PER_TEST = 50;

// ---- PREMIUM GATE (şimdilik demo) ----
const isPremium = false; // sonra Supabase profile’dan okuyacaksın
const FREE_TESTS_OPEN = 2; // premium değilse kaç test açık?

// ✅ EASING (string yok -> TS hatası yok)
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// --- ANIMASYONLAR (Typesafe) ---
const headerVariants: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const cardVariants: Variants = {
  hidden: { y: 14, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: EASE_OUT },
  },
};

// --- HELPERS ---
function makeAttemptId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getFixedTestSlice(all: VocabItem[], testNo: number): VocabItem[] {
  const start = (testNo - 1) * QUESTIONS_PER_TEST;
  return all.slice(start, start + QUESTIONS_PER_TEST);
}

export default function Yds3750Hub() {
  const router = useRouter();

  // 1) JSON normalize + boşları at
  const list = useMemo(() => {
    return (ydsVocabulary as any[])
      .map((x) => ({
        word: String(x?.word ?? '').trim(),
        meaning: String(x?.meaning ?? '').trim(),
        // ✅ s/t normalize
        s: x?.s != null ? String(x.s).trim() : null,
        t: x?.t != null ? String(x.t).trim() : null,
      }))
      .filter((x) => x.word && x.meaning) as VocabItem[];
  }, []);

  // 2) Meaning'leri unique yap (aynı meaning tekrar etmesin)
  const uniqueMeanings = useMemo(() => {
    return Array.from(new Set(list.map((x) => x.meaning)));
  }, [list]);

  // 3) Test sayısını GERÇEK kullanılabilir kelimeye göre hesapla
  const totalWords = list.length;
  const maxPossibleTests = Math.floor(totalWords / QUESTIONS_PER_TEST);
  const safeTestCount = Math.min(TEST_COUNT, Math.max(1, maxPossibleTests));

  const startTest = (testNo: number) => {
    const locked = !isPremium && testNo > FREE_TESTS_OPEN;
    if (locked) {
      router.push('/pricing');
      return;
    }

    const attemptId = makeAttemptId();

    const pack = getFixedTestSlice(list, testNo);
    if (!pack || pack.length === 0) {
      alert(`Test ${testNo} bulunamadı (data yetersiz).`);
      return;
    }

    const questions: Question[] = pack.map((item, idx) => {
      const distractors = shuffle(uniqueMeanings.filter((m) => m !== item.meaning)).slice(0, 3);
      const options = shuffle([item.meaning, ...distractors]);
      const ids = ['a', 'b', 'c', 'd'];

      return {
        id: `yds5000-t${testNo}-q${idx + 1}`,
        prompt: `What is the Turkish meaning of **"${item.word}"**?`,
        choices: options.map((text, i) => ({
          id: ids[i],
          text,
          isCorrect: text === item.meaning,
        })),
        explanation: `**${item.word}**: ${item.meaning}`,

        // ✅ AI CONTEXT payload’a girsin
        s: item.s ?? null,
        t: item.t ?? null,
      };
    });

    const payload = {
      attemptId,
      testSlug: `yds-5000-t${testNo}`,
      test: {
        title: `YDS 5000 VOCAB · TEST ${testNo} (50 Questions)`,
        duration: 25,
      },
      questions,
    };

    sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
    router.push(`/quiz/${attemptId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={headerVariants}
          className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                YDS 5000 <span className="text-blue-600">Vocabulary</span>
              </h1>
              <p className="text-slate-600 mt-2 font-medium">
                {safeTestCount} test · Her test {QUESTIONS_PER_TEST} soru · 25 dakika süre
              </p>

              <div className="mt-3 text-xs text-slate-400">
                Data: <span className="font-semibold">{list.length}</span> kelime yüklü.
                {list.length < 5000 && (
                  <span className="text-amber-600 font-bold"> (5000’den azsa test sayısı otomatik azalır)</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPremium ? (
                <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm">
                  ✅ Premium Active
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-sm">
                  Free Plan · Test 1–{FREE_TESTS_OPEN} açık 🔒
                </div>
              )}
            </div>
          </div>

          {!isPremium && (
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-start gap-3">
              <div className="text-xl">💡</div>
              <div className="text-sm leading-relaxed">
                Premium olduğunda <span className="font-bold">tüm testler açılır</span> +{' '}
                <span className="font-bold">reklamları kaldırırız</span> + ileride{' '}
                <span className="font-bold">istatistik / streak</span> ekleriz.
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={gridVariants}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {Array.from({ length: safeTestCount }).map((_, i) => {
            const testNo = i + 1;
            const locked = !isPremium && testNo > FREE_TESTS_OPEN;

            return (
              <motion.button
                key={testNo}
                variants={cardVariants}
                disabled={locked}
                onClick={() => !locked && startTest(testNo)}
                whileHover={
                  locked
                    ? {}
                    : {
                        scale: 1.03,
                        y: -4,
                        boxShadow: '0px 12px 20px rgba(37, 99, 235, 0.15)',
                      }
                }
                whileTap={locked ? {} : { scale: 0.97 }}
                className={`group relative py-6 rounded-2xl transition-all overflow-hidden border outline-none
                  ${
                    locked
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 hover:border-blue-500 shadow-sm'
                  }`}
              >
                {!locked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <span className={`text-[10px] uppercase tracking-widest mb-1 font-bold ${locked ? 'text-slate-300' : 'text-blue-500'}`}>
                    Test
                  </span>

                  <span className="text-2xl font-black">{testNo}</span>

                  <div className={`mt-2 text-[11px] font-semibold ${locked ? 'text-slate-300' : 'text-blue-600'}`}>
                    50 Questions · 25 min
                  </div>

                  {locked ? (
                    <div className="mt-2 text-sm opacity-70">🔒 Locked</div>
                  ) : (
                    <div className="mt-2 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Start Now
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, ease: EASE_OUT }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            Ana Sayfaya Dön
          </button>

          {!isPremium && (
            <button
              onClick={() => router.push('/pricing')}
              className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              Premium’a Geç
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

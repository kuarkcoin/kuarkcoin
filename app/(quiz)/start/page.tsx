// app/(quiz)/start/page.tsx
'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { getQuestionsBySlug } from '@/lib/quizManager';

// --- HELPER: SHUFFLE ARRAY (for randomizing choices) ---
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- HELPER: SAFE PROMPT FIELD ---
function getPrompt(item: any): string {
  return item.prompt || item.question || item.text || '';
}

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  _origId?: string; // ✅ internal: original id before normalization
};

// ✅ Question payload tip (Quiz sayfası bunu okuyacak)
type QPayload = {
  id: string;
  prompt: string;
  explanation?: string;
  choices: Choice[];
  correctChoiceId?: string; // ✅ IMPORTANT: shuffle sonrası doğru şık id'si
  s?: string | null; // ✅ AI sentence
  t?: string | null; // ✅ AI translation
};

// ✅ EASING (string yok => TS hatası yok)
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// --- ANIMATIONS ---
const wrapVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } },
};

const cardVariants: Variants = {
  hidden: { y: 14, opacity: 0, scale: 0.98 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
};

const textVariants: Variants = {
  hidden: { y: 8, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: 0.08 * i, duration: 0.35, ease: EASE_OUT },
  }),
};

function StartQuizLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // basit progress hissi (gerçek veriyle bağlı değil, UX için)
  const [progress, setProgress] = useState(12);

  const tips = useMemo(
    () => [
      'Tip: First answer is often your best guess.',
      'Tip: Look for keyword clues in the sentence.',
      'Tip: Eliminate two wrong options first.',
      'Tip: Don’t overthink — keep the pace.',
    ],
    []
  );

  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // progress bar animasyonu (0–95 arası gider, bitince route push olacak zaten)
    const t = window.setInterval(() => {
      setProgress((p) => (p >= 95 ? 95 : p + Math.max(1, Math.round((98 - p) / 14))));
    }, 220);

    // tip döndürme
    const tipT = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 1600);

    return () => {
      window.clearInterval(t);
      window.clearInterval(tipT);
    };
  }, [tips.length]);

  useEffect(() => {
    const initQuiz = async () => {
      const slug = searchParams.get('testSlug') || 'quick-placement';
      console.log('STARTING TEST:', slug);

      const { title, questions: rawQuestions } = getQuestionsBySlug(slug);
      const safeQuestions = (rawQuestions || []) as any[];

      const formattedQuestions: QPayload[] = safeQuestions
        .map((item: any, index: number) => {
          const prompt = getPrompt(item);

          let choices: Choice[] | null = null;

          // CASE 1: question + options + correct_option
          const correctKey = item.correct_option ?? item.correct ?? item.answer ?? null;

          if (item.options && typeof item.options === 'object') {
            const optionsObj = item.options as Record<string, string>;
            const labels = Object.keys(optionsObj);

            choices = labels.map((label) => ({
              id: label,
              _origId: label,
              text: optionsObj[label],
              isCorrect:
                correctKey &&
                String(label).trim().toUpperCase() === String(correctKey).trim().toUpperCase(),
            }));
          }

          // CASE 2: A/B/C/D alanları
          if (!choices && (item.A || item.B || item.C || item.D)) {
            const labels: string[] = ['A', 'B', 'C', 'D'];
            choices = labels
              .filter((l) => item[l])
              .map((label) => ({
                id: label,
                _origId: label,
                text: item[label],
                isCorrect:
                  correctKey &&
                  String(label).trim().toUpperCase() === String(correctKey).trim().toUpperCase(),
              }));
          }

          // CASE 3: word + definition (NOT: gerçek distractor yoksa placeholder kalır)
          if (!choices && item.word && item.definition) {
            const baseChoices: Choice[] = [
              { id: 'A', _origId: 'A', text: item.definition, isCorrect: true },
              { id: 'B', _origId: 'B', text: 'Incorrect definition example 1', isCorrect: false },
              { id: 'C', _origId: 'C', text: 'Incorrect definition example 2', isCorrect: false },
              { id: 'D', _origId: 'D', text: 'Incorrect definition example 3', isCorrect: false },
            ];
            choices = baseChoices;
          }

          // CASE 4: already choices[]
          if (!choices && Array.isArray(item.choices)) {
            choices = item.choices.map((c: any, i: number) => {
              const cid = c.id || String.fromCharCode(65 + i);
              return {
                id: cid,
                _origId: cid,
                text: c.text ?? c.label ?? '',
                isCorrect: c.isCorrect === true || c.correct === true || c.is_correct === true,
              };
            });
          }

          if (!choices || choices.length === 0) {
            console.warn('Unknown question format, skipping item:', item);
            return null as any;
          }

          // ✅ Shuffle + normalize ids A/B/C/D
          // IMPORTANT: do NOT lose which one is correct.
          const shuffled = shuffleArray(choices).map((c) => ({
            ...c,
            _origId: c._origId ?? c.id,
          }));

          const normalizedChoices: Choice[] = shuffled.map((c, idx) => ({
            ...c,
            id: String.fromCharCode(65 + idx), // A/B/C/D new ids
          }));

          // ✅ Compute correctChoiceId AFTER shuffle+normalize
          const correctChoiceId =
            normalizedChoices.find((c) => c.isCorrect)?.id ?? undefined;

          // ✅ s/t köprüsü: item içinden al, yoksa null
          const s = item?.s ?? item?.sentence ?? null;
          const t = item?.t ?? item?.translation ?? null;

          return {
            id: item.id || `q-${index}`,
            prompt,
            explanation: item.explanation,
            choices: normalizedChoices,
            correctChoiceId,
            s: s ? String(s) : null,
            t: t ? String(t) : null,
          };
        })
        .filter(Boolean);

      console.log('FORMATTED QUESTIONS (AFTER SHUFFLE):', formattedQuestions);

      // ✅ optional debug: ilk 5 soruda doğru hep A mı diye kontrol
      console.log(
        'DEBUG correctChoiceId (first 5):',
        formattedQuestions.slice(0, 5).map((q) => ({
          qid: q.id,
          correct: q.correctChoiceId,
          marks: q.choices.map((c) => `${c.id}${c.isCorrect ? '✅' : ''}`).join(' '),
        }))
      );

      const attemptData = {
        attemptId: `session-${Date.now()}`,
        testSlug: slug, // ✅ restart için
        test: {
          title: title,
          duration: 0, // Quiz.tsx questionCount * 60s (senin logic'e göre)
        },
        questions: formattedQuestions,
      };

      // UX: %100’e çekiyormuş gibi yap
      setProgress(100);

      sessionStorage.setItem('em_attempt_payload', JSON.stringify(attemptData));
      router.push(`/quiz/${attemptData.attemptId}`);
    };

    initQuiz();
  }, [searchParams, router]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={wrapVariants}
      className="min-h-screen flex items-center justify-center bg-slate-50 p-4"
    >
      <motion.div
        variants={cardVariants}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-7"
      >
        <motion.div
          custom={0}
          variants={textVariants}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold"
        >
          ⚡ Preparing your test
        </motion.div>

        <motion.h1 custom={1} variants={textVariants} className="mt-4 text-2xl font-black text-slate-900">
          Your test is starting…
        </motion.h1>

        <motion.p custom={2} variants={textVariants} className="mt-2 text-slate-600 text-sm leading-relaxed">
          Please wait while we prepare your questions.
        </motion.p>

        <motion.div custom={3} variants={textVariants} className="mt-6 flex items-center gap-3">
          <motion.div
            aria-label="loading"
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: EASE_OUT }}
            className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center"
          >
            <div className="w-3 h-3 rounded-full bg-blue-600" />
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
              <span>Loading</span>
              <span>{Math.min(100, Math.max(0, progress))}%</span>
            </div>

            <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="h-full rounded-full bg-blue-600"
              />
            </div>
          </div>
        </motion.div>

        <motion.div custom={4} variants={textVariants} className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-bold text-slate-500">Quick Tip</div>
          <motion.div
            key={tipIndex}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="mt-1 text-sm font-semibold text-slate-800"
          >
            {tips[tipIndex]}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Start() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <StartQuizLogic />
    </Suspense>
  );
}

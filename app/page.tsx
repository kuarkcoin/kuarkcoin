'use client';

import React, { useEffect, useMemo, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
 
// --- DATA IMPORTS ---
import topicQuestions from '@/data/grammar_topic_tests.json';
import ydsVocabulary from '@/data/yds_vocabulary.json';
import ydsGrammarQuestions from '@/data/yds_grammar.json';
import ydsPhrasals from '@/data/yds_phrasal_verbs.json';
import ydsReadingPassages from '@/data/yds_reading.json';
import ydsSynonyms from '@/data/yds_synonyms.json';
import ydsConjunctions from '@/data/yds_conjunctions.json';

// --- YDS EXAM DENEMELERİ (1..15) ---
import ydsExamQuestions1 from '@/data/yds_exam_questions.json';
import ydsExamQuestions2 from '@/data/yds_exam_questions_2.json';
import ydsExamQuestions3 from '@/data/yds_exam_questions_3.json';
import ydsExamQuestions4 from '@/data/yds_exam_questions_4.json';
import ydsExamQuestions5 from '@/data/yds_exam_questions_5.json';
import ydsExamQuestions6 from '@/data/yds_exam_questions_6.json';
import ydsExamQuestions7 from '@/data/yds_exam_questions_7.json';
import ydsExamQuestions8 from '@/data/yds_exam_questions_8.json';
import ydsExamQuestions9 from '@/data/yds_exam_questions_9.json';
import ydsExamQuestions10 from '@/data/yds_exam_questions_10.json';
import ydsExamQuestions11 from '@/data/yds_exam_questions_11.json';
import ydsExamQuestions12 from '@/data/yds_exam_questions_12.json';
import ydsExamQuestions13 from '@/data/yds_exam_questions_13.json';
import ydsExamQuestions14 from '@/data/yds_exam_questions_14.json';
import ydsExamQuestions15 from '@/data/yds_exam_questions_15.json';

// --- TEST DATA MAP ---
const YDS_EXAM_MAP: Record<string, any[]> = {
  '1': ydsExamQuestions1,
  '2': ydsExamQuestions2,
  '3': ydsExamQuestions3,
  '4': ydsExamQuestions4,
  '5': ydsExamQuestions5,
  '6': ydsExamQuestions6,
  '7': ydsExamQuestions7,
  '8': ydsExamQuestions8,
  '9': ydsExamQuestions9,
  '10': ydsExamQuestions10,
  '11': ydsExamQuestions11,
  '12': ydsExamQuestions12,
  '13': ydsExamQuestions13,
  '14': ydsExamQuestions14,
  '15': ydsExamQuestions15,
};

// --- TEST TANIMLARI ---
const quickTest = { title: 'Quick Placement Test', slug: 'quick-placement' };
const megaTest = { title: 'Grammar Mega Test (100Q)', slug: 'grammar-mega-test-100' };
const vocabTest = { title: 'Vocabulary B1-C1 (50Q)', slug: 'vocab-b1-c1-50' };
const raceTest = { title: 'Global Race Mode', href: '/race' };
const ieltsTest = { title: 'IELTS Grammar (50Q)', slug: 'ielts-grammar' };

// YDS TESTLERİ
const ydsVocabHub = { title: 'YDS 5000 Words (100 Mini Tests)', slug: 'yds-5000-vocab-hub' };
const ydsGrammarTest = { title: 'YDS Grammar Practice (100Q)', slug: 'yds-grammar-practice' };
const ydsPhrasalTest = { title: 'YDS Phrasal Verbs (100Q)', slug: 'yds-phrasal-verbs' };
const ydsReadingTest = { title: 'YDS Reading (40Q)', slug: 'yds-reading' };
const ydsSynonymTest = { title: 'YDS Synonyms (Advanced)', slug: 'yds-synonyms' };
const ydsConjunctionTest = { title: 'YDS Conjunctions (Bağlaçlar)', slug: 'yds-conjunctions' };

// Grammar Focus testleri
const grammarTests = [
  { title: 'Perfect Tenses', slug: 'test-perfect-past' },
  { title: 'Conditionals', slug: 'test-conditionals' },
  { title: 'Relative Clauses', slug: 'test-relatives' },
  { title: 'Articles', slug: 'test-articles' },
  { title: 'Mixed Tenses', slug: 'test-tenses-mixed' },
  { title: 'Passive Voice (Adv)', slug: 'test-passive-voice' },
  { title: 'Reported Speech (Adv)', slug: 'test-reported-speech' },
  { title: 'Gerunds & Infinitives', slug: 'test-gerunds-infinitives' },
  { title: 'Noun/Adj/Adv Clauses', slug: 'test-clauses-advanced' },
  { title: 'Modal Verbs (Adv)', slug: 'test-modals-advanced' },
  { title: 'Prepositions (Adv)', slug: 'test-prepositions-advanced' },
];

const levelTests = [{ level: 'A1' }, { level: 'A2' }, { level: 'B1' }, { level: 'B2' }, { level: 'C1' }, { level: 'C2' }];

const slugToTag: Record<string, string> = {
  'test-perfect-past': 'perfect_tenses',
  'test-conditionals': 'conditionals',
  'test-relatives': 'relative_clauses',
  'test-articles': 'articles',
  'test-tenses-mixed': 'mixed_tenses',
  'test-passive-voice': 'passive_voice_adv',
  'test-reported-speech': 'reported_speech',
  'test-gerunds-infinitives': 'gerunds_infinitives',
  'test-clauses-advanced': 'clauses_advanced',
  'test-modals-advanced': 'modals_advanced',
  'test-prepositions-advanced': 'prepositions_advanced',
};

// --- HELPERS ---
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeAttemptId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Deterministic RNG (LCG) for stable mini-tests
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seededUniqueIndices(total: number, need: number, seed: number) {
  const rand = lcg(seed);
  const picked = new Set<number>();
  const maxAttempts = total * 10;

  let attempts = 0;
  while (picked.size < need && attempts < maxAttempts) {
    const idx = Math.floor(rand() * total);
    picked.add(idx);
    attempts++;
  }

  // fallback if something weird happens
  if (picked.size < need) {
    for (let i = 0; i < total && picked.size < need; i++) picked.add(i);
  }

  return Array.from(picked);
}

// LocalStorage keys
const LS_PREMIUM = 'em_is_premium';
const LS_LAST = 'em_last_test';
const LS_VOCAB_MAP = 'em_yds5000_map_v1';

// Save / load helpers (safe)
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// --- ANA BİLEŞEN İÇERİĞİ ---
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restartSlug = searchParams.get('restart');

  const [isRestarting, setIsRestarting] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showYds3750Hub, setShowYds3750Hub] = useState(false);
  const [lastTest, setLastTest] = useState<{ title: string; slug: string; at: string } | null>(null);

  // Hangi YDS exam testleri gerçekten var?
  const availableExamTests = useMemo(() => {
    return Object.keys(YDS_EXAM_MAP)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }, []);

  // Load premium + last test
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = localStorage.getItem(LS_PREMIUM);
    setIsPremium(p === '1' || p === 'true');

    const last = safeJsonParse<{ title: string; slug: string; at: string } | null>(localStorage.getItem(LS_LAST), null);
    if (last?.slug && last?.title) setLastTest(last);
  }, []);

  // --- 75 mini test mapping (stable) ---
  const ensureVocabMap = useCallback(() => {
    const total = (ydsVocabulary as any[])?.length || 0;
    const map = safeJsonParse<Record<string, number[]>>(typeof window !== 'undefined' ? localStorage.getItem(LS_VOCAB_MAP) : null, {});
    if (!total) return map;

    // Ensure 1..100 exist
    let changed = false;
    for (let t = 1; t <= 100; t++) {
      const key = String(t);
      if (!Array.isArray(map[key]) || map[key].length !== 50) {
        // seed by test number, but also depend on total length (so changes don't break too hard)
        map[key] = seededUniqueIndices(total, 50, 1000 + t * 99991 + total * 17);
        changed = true;
      }
    }
    if (changed && typeof window !== 'undefined') {
      localStorage.setItem(LS_VOCAB_MAP, JSON.stringify(map));
    }
    return map;
  }, []);

  // --- TEST BAŞLATMA MANTIĞI ---
  const startTest = useCallback(
    (testSlug: string) => {
      const attemptId = makeAttemptId();

      // Save last test (for "Continue" UX)
      const saveLast = (title: string, slug: string) => {
        try {
          const payload = { title, slug, at: new Date().toISOString() };
          localStorage.setItem(LS_LAST, JSON.stringify(payload));
          setLastTest(payload);
        } catch {}
      };

      // --- YDS 3750 MINI TESTS (1..75) ---
      if (testSlug.startsWith('yds-5000-mini-')) {
        const nStr = testSlug.split('-').pop() || '1';
        const n = Math.max(1, Math.min(100, Number(nStr) || 1));

        const map = ensureVocabMap();
        const indices = map[String(n)] || [];

        const pool = ydsVocabulary as any[];
        const selectedWords = indices.map((i) => pool[i]).filter(Boolean);

        // 50Q, 25min default (user request)
        const questions = selectedWords.map((item: any, idx: number) => {
          const correctAnswer = item.meaning;

          const distractors = shuffle(
            pool
              .filter((w: any) => w.meaning !== correctAnswer)
              .map((w: any) => w.meaning)
          ).slice(0, 3);

          const allOptions = shuffle([...distractors, correctAnswer]);
          const idsLower = ['a', 'b', 'c', 'd'];

          return {
            id: `yds-5000-mini-${n}-q${idx + 1}`,
            prompt: `What is the Turkish meaning of **"${item.word}"**?`,
            choices: allOptions.map((optText: string, i: number) => ({
              id: idsLower[i],
              text: optText,
              isCorrect: optText === correctAnswer,
            })),
            explanation: `**${item.word}**: ${correctAnswer}`,
          };
        });

        const title = `YDS 5000 WORDS · MINI TEST ${n} (50Q · 25 min)`;

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 25 }, // minutes (we will use in Quiz page later)
          durationSeconds: 25 * 60,
          questions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // --- YDS EXAM PACK ---
      if (testSlug.startsWith('yds-exam-test-')) {
        const testNumber = testSlug.split('-').pop() || '1';
        const selectedQuestions = YDS_EXAM_MAP[testNumber];

        if (!selectedQuestions || selectedQuestions.length === 0) {
          alert(`Test ${testNumber} is coming soon! Please complete existing tests first.`);
          return;
        }

        const mappedQuestions = [...selectedQuestions].map((q: any, idx: number) => {
          const correctLetter = String(q.correct || 'A').trim().toUpperCase();
          const letters = ['A', 'B', 'C', 'D', 'E'];
          const idsLower = ['a', 'b', 'c', 'd', 'e'];

          const choices = letters
            .map((L, i) => ({
              id: idsLower[i],
              text: q[L],
              isCorrect: correctLetter === L,
            }))
            .filter((c: any) => c.text);

          return {
            id: `yds-exam${testNumber}-q${idx + 1}`,
            prompt: q.prompt,
            choices,
            explanation: q.explanation || '',
          };
        });

        const title = `YDS REAL EXAM · TEST ${testNumber} (80Q · 150 min)`;

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 150 },
          durationSeconds: 150 * 60,
          questions: mappedQuestions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 1) YDS READING
      if (testSlug === 'yds-reading') {
        const selectedPassages = shuffle(ydsReadingPassages as any[]).slice(0, 10);
        const questions: any[] = [];

        selectedPassages.forEach((passage, pIndex) => {
          passage.questions.forEach((q: any, qIndex: number) => {
            const letters = ['A', 'B', 'C', 'D', 'E'];
            const idsLower = ['a', 'b', 'c', 'd', 'e'];

            const choices = letters.map((L, i) => ({
              id: idsLower[i],
              text: q[L],
              isCorrect: L === q.correct,
            }));

            questions.push({
              id: `yds-read-p${passage.passageId}-q${qIndex + 1}`,
              prompt: `
                <div class="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed text-slate-700">
                  <strong>Passage ${pIndex + 1}:</strong><br/>
                  ${passage.text}
                </div>
                <div class="font-bold text-slate-900">
                  ${q.prompt}
                </div>
              `,
              choices,
              explanation: q.explanation,
            });
          });
        });

        const title = 'YDS READING COMPREHENSION (40Q · 80 min)';

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 80 },
          durationSeconds: 80 * 60,
          questions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 2) YDS GRAMMAR
      if (testSlug === 'yds-grammar-practice') {
        const selectedQuestions = shuffle(ydsGrammarQuestions as any[]).slice(0, 100);

        const mappedQuestions = selectedQuestions.map((q: any, idx: number) => {
          const correctLetter = String(q.correct || 'A').trim().toUpperCase();
          const letters = ['A', 'B', 'C', 'D'];
          const idsLower = ['a', 'b', 'c', 'd'];

          return {
            id: `yds-grammar-q${idx + 1}`,
            prompt: q.prompt,
            choices: letters.map((L, i) => ({
              id: idsLower[i],
              text: q[L] || `Option ${L}`,
              isCorrect: correctLetter === L,
            })),
            explanation: q.explanation || '',
          };
        });

        const title = 'YDS GRAMMAR PRACTICE (100Q · 90 min)';

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 90 },
          durationSeconds: 90 * 60,
          questions: mappedQuestions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 3) YDS PHRASAL VERBS
      if (testSlug === 'yds-phrasal-verbs') {
        const selectedWords = shuffle(ydsPhrasals as any[]).slice(0, 100);

        const questions = selectedWords.map((item: any, idx: number) => {
          const correctAnswer = item.meaning;

          const distractors = shuffle(
            (ydsPhrasals as any[])
              .filter((w: any) => w.meaning !== correctAnswer)
              .map((w: any) => w.meaning)
          ).slice(0, 3);

          const allOptions = shuffle([...distractors, correctAnswer]);
          const idsLower = ['a', 'b', 'c', 'd'];

          return {
            id: `yds-phrasal-q${idx + 1}`,
            prompt: `What is the meaning of the phrasal verb **"${item.word}"**?`,
            choices: allOptions.map((optText: string, i: number) => ({
              id: idsLower[i],
              text: optText,
              isCorrect: optText === correctAnswer,
            })),
            explanation: `**${item.word}**: ${correctAnswer}`,
          };
        });

        const title = 'YDS PHRASAL VERBS (100Q · 75 min)';

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 75 },
          durationSeconds: 75 * 60,
          questions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 5) YDS SYNONYMS
      if (testSlug === 'yds-synonyms') {
        const selectedWords = shuffle(ydsSynonyms as any[]).slice(0, 50);

        const questions = selectedWords.map((item: any, idx: number) => {
          const correctAnswer = item.synonym;

          let distractors = item.distractors;
          if (!distractors || distractors.length === 0) {
            distractors = shuffle(
              (ydsSynonyms as any[])
                .filter((w: any) => w.synonym !== correctAnswer)
                .map((w: any) => w.synonym)
            ).slice(0, 3);
          } else {
            distractors = shuffle(distractors).slice(0, 3);
          }

          const allOptions = shuffle([...distractors, correctAnswer]);
          const letters = ['A', 'B', 'C', 'D'];
          const idsLower = ['a', 'b', 'c', 'd'];

          return {
            id: `yds-syn-q${idx + 1}`,
            prompt: `Select the word that is closest in meaning to: <br/> <strong class="text-xl text-blue-700">"${item.word}"</strong> <span class="text-sm text-gray-500">(${item.meaning})</span>`,
            choices: letters.map((L, i) => ({
              id: idsLower[i],
              text: allOptions[i],
              isCorrect: allOptions[i] === correctAnswer,
            })),
            explanation: `**${item.word}** means "${item.meaning}". <br/> Synonym: **${correctAnswer}**.`,
          };
        });

        const title = 'YDS SYNONYMS PRACTICE (50Q · 40 min)';

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 40 },
          durationSeconds: 40 * 60,
          questions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 6) YDS CONJUNCTIONS
      if (testSlug === 'yds-conjunctions') {
        const selectedQuestions = shuffle(ydsConjunctions as any[]).slice(0, 50);

        const mappedQuestions = selectedQuestions.map((q: any, idx: number) => {
          const correctLetter = String(q.correct || 'A').trim().toUpperCase();
          const letters = ['A', 'B', 'C', 'D', 'E'];
          const idsLower = ['a', 'b', 'c', 'd', 'e'];

          return {
            id: `yds-conj-q${idx + 1}`,
            prompt: q.prompt,
            choices: letters
              .map((L, i) => ({
                id: idsLower[i],
                text: q[L],
                isCorrect: correctLetter === L,
              }))
              .filter((c: any) => c.text),
            explanation: q.explanation || '',
          };
        });

        const title = 'YDS CONJUNCTIONS (50Q · 35 min)';

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 35 },
          durationSeconds: 35 * 60,
          questions: mappedQuestions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 7) QUICK PLACEMENT
      if (testSlug === 'quick-placement') {
        const selectedQuestions = shuffle(topicQuestions as any[]).slice(0, 50);

        const mappedQuestions = selectedQuestions.map((q: any, idx: number) => {
          const correctLetter = String(q.correct || 'A').trim().toUpperCase();
          const letters = ['A', 'B', 'C', 'D'];
          const idsLower = ['a', 'b', 'c', 'd'];

          return {
            id: `quick-q${idx + 1}`,
            prompt: q.prompt,
            choices: letters.map((L, i) => ({
              id: idsLower[i],
              text: q[L] || `Option ${L}`,
              isCorrect: correctLetter === L,
            })),
            explanation: q.explanation || '',
          };
        });

        const title = 'COMPREHENSIVE PLACEMENT TEST (50Q · 25 min)';

        const payload = {
          attemptId,
          testSlug,
          test: { title, duration: 25 },
          durationSeconds: 25 * 60,
          questions: mappedQuestions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // 8) GRAMMAR FOCUS (tag tabanlı)
      if (slugToTag[testSlug]) {
        const tag = slugToTag[testSlug];
        const grammarTitle = grammarTests.find((t) => t.slug === testSlug)?.title;

        const rawQuestions = shuffle((topicQuestions as any[]).filter((q: any) => q.tags?.includes(tag))).slice(0, 20);

        const mappedQuestions = rawQuestions.map((q: any, idx: number) => {
          const correctLetter = String(q.correct || 'A').trim().toUpperCase();
          const letters = ['A', 'B', 'C', 'D'];
          const idsLower = ['a', 'b', 'c', 'd'];

          return {
            id: `${testSlug}-q${idx + 1}`,
            prompt: q.prompt,
            choices: letters.map((L, i) => ({
              id: idsLower[i],
              text: q[L] || `Option ${L}`,
              isCorrect: correctLetter === L,
            })),
            explanation: q.explanation || '',
          };
        });

        const title = `${(grammarTitle || 'Practice Test').toUpperCase()} (20Q · 30 min)`;

        const payload: any = {
          attemptId,
          testSlug,
          test: { title, duration: 30 },
          durationSeconds: 30 * 60,
          questions: mappedQuestions,
        };

        sessionStorage.setItem('em_attempt_payload', JSON.stringify(payload));
        saveLast(title, testSlug);
        router.push(`/quiz/${attemptId}`);
        return;
      }

      // default: send to /start
      router.push(`/start?testSlug=${encodeURIComponent(testSlug)}`);
    },
    [ensureVocabMap, router]
  );

  // restart parametresi ile otomatik başlat
  useEffect(() => {
    if (!restartSlug) return;
    setIsRestarting(true);
    const timer = setTimeout(() => startTest(restartSlug), 250);
    return () => clearTimeout(timer);
  }, [restartSlug, startTest]);

  if (isRestarting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-slate-800 animate-pulse">Starting New Test...</h2>
        <p className="text-slate-500 mt-2">Preparing fresh questions from the pool</p>
      </div>
    );
  }

  const freeMiniCount = 100; // Premium yoksa ilk 8 mini test ücretsiz gibi düşün

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="w-full max-w-6xl mx-auto px-4 pt-10 pb-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-3">
              EnglishMeter · FREE ENGLISH TESTS
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 leading-tight">
              Find your English level
              <span className="text-blue-600"> in minutes.</span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg mb-5">
              Online English grammar tests, CEFR level quizzes (A1–C2) and quick placement exams with instant results and detailed review.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => startTest(quickTest.slug)}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm sm:text-base shadow-md hover:bg-blue-700 transition"
              >
                Start placement test
              </button>

              <a
                href="#all-tests"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm sm:text-base bg-white hover:bg-slate-50 transition"
              >
                Browse all tests
              </a>
            </div>

            {/* Continue last */}
            {lastTest && (
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => startTest(lastTest.slug)}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm sm:text-base shadow-md hover:bg-slate-800 transition"
                >
                  ▶ Continue: {lastTest.title}
                </button>
                <Link
                  href="/mistakes"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-red-50 text-red-700 font-semibold text-sm sm:text-base border border-red-200 hover:bg-red-100 transition"
                >
                  📕 Mistake Bank
                </Link>
              </div>
            )}

            {/* Premium teaser */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">Premium (Coming soon)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Unlock all YDS 3750 mini tests + extra packs + analytics.
                  </div>
                </div>
                <button
                  onClick={() => {
                    // şimdilik demo: premium toggle
                    const next = !isPremium;
                    setIsPremium(next);
                    localStorage.setItem(LS_PREMIUM, next ? '1' : '0');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    isPremium
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isPremium ? '✅ Premium Active (demo)' : '🔒 Enable Premium (demo)'}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="relative mx-auto max-w-sm">
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-500 p-6 shadow-2xl text-white">
                <div className="text-sm font-semibold opacity-80 mb-2">Sample result</div>
                <div className="text-4xl font-black mb-1">B2</div>
                <div className="text-sm opacity-90 mb-4">Upper-Intermediate · 78% accuracy</div>
                <div className="w-full h-2 rounded-full bg-blue-300/40 mb-3 overflow-hidden">
                  <div className="h-full w-3/4 bg-white/90 rounded-full" />
                </div>
                <p className="text-xs opacity-90">
                  Take a 20–50 question test and instantly see your estimated CEFR level, score and explanations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <div className="flex flex-col items-center justify-center px-4 pb-16 pt-4">
        <div id="all-tests" className="w-full max-w-6xl mx-auto text-center">

          {/* GAME MODES (Öne Çıkan Flashcards Düzeni) */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
  
  {/* 🧠 FLASHCARDS - ÖNE ÇIKAN (Geniş Kart) */}
  <a
    href="/flashcards"
    className="group relative overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-3xl p-8 border border-emerald-800 shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left lg:col-span-2 flex flex-col justify-between"
  >
    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500 rounded-full opacity-10 blur-3xl"></div>
    <div className="relative z-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase mb-4 border border-emerald-500/30">
        🧠 Most Popular Study Mode
      </div>
      <h3 className="text-3xl md:text-4xl font-black text-white mb-3">Academic Flashcards</h3>
      <p className="text-emerald-200/80 text-sm md:text-base max-w-lg leading-relaxed">
        Master **3,850 essential YDS, YÖKDİL & TOEFL words**. Now featuring 
        <span className="text-emerald-400 font-bold"> AI-generated academic sentences</span>, 
        professional pronunciations, and smart memory tracking.
      </p>
    </div>
    
    <div className="relative z-10 mt-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
          <span className="text-2xl font-bold">↺</span>
        </div>
        <div className="text-xs">
          <div className="text-emerald-400 font-black uppercase tracking-widest">Start Memorizing</div>
          <div className="text-emerald-500/60 font-medium">5000 words archive</div>
        </div>
      </div>
      <div className="hidden sm:block text-emerald-500/30 text-6xl font-black select-none">5000</div>
    </div>
  </a>
 <a
  href="/vocab-es"
  className="group relative overflow-hidden bg-gradient-to-br from-yellow-900 to-amber-950 rounded-3xl p-6 border border-yellow-800 shadow-xl hover:shadow-yellow-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
>
  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-500 rounded-full opacity-10 blur-xl"></div>
  <div className="relative z-10">
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-full text-yellow-300 text-[10px] font-bold uppercase mb-3">
      🇪🇸 Spanish
    </div>
    <h3 className="text-2xl font-black text-white mb-1">Vocab Tests (EN → ES)</h3>
    <p className="text-yellow-200 text-xs mb-4">Finish anytime · review answered words.</p>
    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-amber-950 font-black">▶</div>
  </div>
</a>
 {/* 🇸🇦 DAILY EN → AR VOCAB TEST (Finish Anytime) */}
<a
  href="/vocab-finish-ar"
  className="group relative overflow-hidden
             bg-gradient-to-br from-amber-900 to-amber-950
             rounded-3xl p-6 border border-amber-800
             shadow-xl hover:shadow-amber-500/20
             transition-all duration-300
             transform hover:-translate-y-1 text-left"
>
  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-400 rounded-full opacity-10 blur-xl" />

  <div className="relative z-10 flex flex-col h-full justify-between">
    <div>
      <div className="inline-flex items-center gap-1 px-2 py-1
                      bg-amber-400/10 rounded-full
                      text-amber-300 text-[10px]
                      font-bold uppercase mb-3">
        🇸🇦 Finish Anytime
        <span className="ml-1 px-2 py-[2px] rounded-full bg-amber-400/15 text-amber-200">
          AR
        </span>
      </div>

      <h3 className="text-2xl font-black text-white mb-1">
        🇸🇦 Vocab Tests (EN → AR) 
      </h3>

      <p className="text-amber-200 text-xs mb-4 leading-relaxed">
        Finish anytime → Arabic meaning + EN sentence + AR translation.
      </p>
    </div>

    <div className="w-11 h-11 bg-amber-400 rounded-full
                    flex items-center justify-center
                    text-amber-950 font-black">
      ▶
    </div>
  </div>
</a>



 {/* 🇹🇷 Vocab EN → TR TEST (Finish Anytime) */}
<a
  href="/vocab-finish"
  className="group relative overflow-hidden
             bg-gradient-to-br from-cyan-900 to-cyan-950
             rounded-3xl p-6 border border-cyan-800
             shadow-xl hover:shadow-cyan-500/20
             transition-all duration-300
             transform hover:-translate-y-1 text-left"
>
  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-cyan-400 rounded-full opacity-10 blur-xl"></div>

  <div className="relative z-10 flex flex-col h-full justify-between">
    <div>
      <div className="inline-flex items-center gap-1 px-2 py-1
                      bg-cyan-400/10 rounded-full
                      text-cyan-300 text-[10px]
                      font-bold uppercase mb-3">
        🇹🇷 Finish Anytime
      </div>

      <h3 className="text-2xl font-black text-white mb-1">
        Vocab Tests (EN → TR) 
      </h3>

      <p className="text-cyan-200 text-xs mb-4">
        Finish anytime → Turkish meaning + EN sentence + TR translation.
      </p>
    </div>

    <div className="w-11 h-11 bg-cyan-400 rounded-full
                    flex items-center justify-center
                    text-cyan-950 font-black">
      ▶
    </div>
  </div>
</a>


  {/* ⚡ SPEEDRUN */}
  <a
    href="/speedrun"
    className="group relative overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-3xl p-6 border border-indigo-800 shadow-xl hover:shadow-yellow-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-500 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10">
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-full text-yellow-400 text-[10px] font-bold uppercase mb-3">
        ⚡ Fast
      </div>
      <h3 className="text-2xl font-black text-white mb-1">SpeedRun</h3>
      <p className="text-indigo-200 text-xs mb-4">120 seconds challenge.</p>
      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-indigo-950 font-bold group-hover:rotate-12 transition-transform">▶</div>
    </div>
  </a>

  {/* 🏆 RACE ARENA */}
  <a
    href="/race"
    className="group relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10">
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-full text-blue-400 text-[10px] font-bold uppercase mb-3">
        🏆 Live
      </div>
      <h3 className="text-2xl font-black text-white mb-1">Race Arena</h3>
      <p className="text-slate-400 text-xs mb-4">Compete with others.</p>
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">⚔</div>
    </div>
  </a>

  {/* 🎙️ SPEAKING */}
  <a
    href="/speaking"
    className="group relative overflow-hidden bg-gradient-to-br from-rose-900 to-rose-950 rounded-3xl p-6 border border-rose-800 shadow-xl hover:shadow-rose-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-rose-500 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div>
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 rounded-full text-rose-300 text-[10px] font-bold uppercase mb-3">
          🎙️ Speaking
        </div>
        <h3 className="text-2xl font-black text-white mb-1">AI Conversations</h3>
        <p className="text-rose-200 text-xs mb-4">Daily real-life scenarios.</p>
      </div>
      <div className="w-11 h-11 bg-rose-400 rounded-full flex items-center justify-center text-rose-950 font-black">▶</div>
    </div>
  </a>

  {/* 🔤 VERB SENSE */}
  <a
    href="/verbsense"
    className="group relative overflow-hidden bg-gradient-to-br from-indigo-800 to-indigo-950 rounded-3xl p-6 border border-indigo-700 shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-400 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div>
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-400/10 rounded-full text-indigo-300 text-[10px] font-bold uppercase mb-3">
          🔤 Grammar
        </div>
        <h3 className="text-2xl font-black text-white mb-1">Verb Sense</h3>
        <p className="text-indigo-200 text-xs mb-4">Master natural usage.</p>
      </div>
      <div className="w-11 h-11 bg-indigo-400 rounded-full flex items-center justify-center text-indigo-950 font-black">▶</div>
    </div>
  </a>

  {/* 🔊 MATCHING GAME */}
  <a
    href="/matching"
    className="group relative overflow-hidden bg-gradient-to-br from-teal-900 to-teal-950 rounded-3xl p-6 border border-teal-800 shadow-xl hover:shadow-teal-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-teal-400 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div>
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-teal-400/10 rounded-full text-teal-300 text-[10px] font-bold uppercase mb-3">
          🔊 Vocab
        </div>
        <h3 className="text-2xl font-black text-white mb-1">Matching Game</h3>
        <p className="text-teal-200 text-xs mb-4">Word to sound matching.</p>
      </div>
      <div className="w-11 h-11 bg-teal-400 rounded-full flex items-center justify-center text-teal-950 font-black">▶</div>
    </div>
  </a>

  {/* 🧩 PHRASAL PUZZLE */}
  <a
    href="/phrasal-puzzle"
    className="group relative overflow-hidden bg-gradient-to-br from-fuchsia-900 to-fuchsia-950 rounded-3xl p-6 border border-fuchsia-800 shadow-xl hover:shadow-fuchsia-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-fuchsia-500 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10">
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-fuchsia-500/10 rounded-full text-fuchsia-300 text-[10px] font-bold uppercase mb-3">
        🧩 Logic
      </div>
      <h3 className="text-2xl font-black text-white mb-1">Phrasal Puzzle</h3>
      <p className="text-fuchsia-200 text-xs mb-4">Fast phrasal verb builder.</p>
      <div className="w-10 h-10 bg-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold">✦</div>
    </div>
  </a>

  {/* 📕 MISTAKE BANK */}
  <Link
    href="/mistakes"
    className="group relative overflow-hidden bg-gradient-to-br from-red-900 to-red-950 rounded-3xl p-6 border border-red-800 shadow-xl hover:shadow-red-500/20 transition-all duration-300 transform hover:-translate-y-1 text-left"
  >
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-500 rounded-full opacity-10 blur-xl"></div>
    <div className="relative z-10">
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded-full text-red-300 text-[10px] font-bold uppercase mb-3">
        📕 Review
      </div>
      <h3 className="text-2xl font-black text-white mb-1">Mistake Bank</h3>
      <p className="text-red-200 text-xs mb-4">Your personalized review.</p>
      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] text-red-300/60 font-semibold uppercase tracking-widest">Smart Practice</div>
        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-red-950 font-black group-hover:scale-110 transition-transform">▶</div>
      </div>
    </div>
  </Link>
</div>
{/* MAIN TESTS GRID */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
  <button
    onClick={() => startTest(quickTest.slug)}
    className="flex flex-col items-center justify-center px-6 py-8 rounded-2xl bg-blue-600 text-white text-xl font-black shadow-xl hover:bg-blue-700 transition-all"
  >
    <div>{quickTest.title}</div>
    <div className="mt-2 text-xs font-semibold opacity-90">50Q · 25 min · Instant results</div>
    <Link
      href="/start?testSlug=quick-placement"
      className="mt-3 text-[11px] underline opacity-90 hover:opacity-100"
    >
      Learn more →
    </Link>
  </button>

  <button
    onClick={() => startTest(megaTest.slug)}
    className="flex flex-col items-center justify-center px-6 py-8 rounded-2xl bg-purple-600 text-white text-xl font-black shadow-xl hover:bg-purple-700 transition-all"
  >
    <div>{megaTest.title}</div>
    <div className="mt-2 text-xs font-semibold opacity-90">100Q · Timed · Deep review</div>
    <Link
      href="/start?testSlug=grammar-mega-test-100"
      className="mt-3 text-[11px] underline opacity-90 hover:opacity-100"
    >
      Learn more →
    </Link>
  </button>

  {/* 🔥 YDS 5000 HERO (GRID ITEM) */}
  <button
    type="button"
    onClick={() => {
      const next = !showYds3750Hub;
      setShowYds3750Hub(next);
      if (!next) return;

      ensureVocabMap();
      setTimeout(() => {
        document.getElementById("yds3750hub")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }}
    className={`group relative overflow-hidden rounded-2xl p-6 md:p-7 text-left
      bg-gradient-to-br from-orange-600 via-orange-700 to-amber-600
      text-white shadow-xl transition-all duration-300 transform hover:-translate-y-1
      hover:shadow-orange-500/30
      ${showYds3750Hub ? "ring-2 ring-amber-200 ring-offset-2 ring-offset-white" : ""}`}
  >
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-300 opacity-20 rounded-full blur-3xl"></div>

    <div className="relative z-10 flex flex-col justify-between h-full">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-[10px] font-black uppercase mb-3 border border-white/20">
          📚 Vocabulary Mega Pack
        </div>

        <div className="text-2xl font-black leading-tight">YDS 5000 Mini Tests</div>

        <div className="mt-2 text-xs text-white/90 leading-relaxed">
          100 mini test · <span className="font-black">50 soru</span> · 25 dakika
          <br />
          Aynı test numarası → aynı sorular
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[11px] font-bold text-white/90">
          {isPremium ? "✅ Premium unlocked" : `🔒 Free: first ${freeMiniCount}`}
        </div>

        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-700 text-2xl font-black shadow-lg group-hover:scale-110 transition-transform">
          {showYds3750Hub ? "×" : "▶"}
        </div>
      </div>
    </div>
  </button>
</div>

{/* 📂 YDS HUB PANEL (GRID DIŞINDA!) */}
{showYds3750Hub && (
  <div
    id="yds3750hub"
    className="mb-12 bg-orange-50 rounded-3xl p-6 border-2 border-orange-200 shadow-xl relative overflow-hidden text-left animate-in slide-in-from-top-4 duration-300"
  >
    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-amber-400"></div>

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      <div>
        <h3 className="text-2xl font-black text-orange-700 flex items-center gap-2">
          <span className="text-3xl">📚</span> YDS 5000 Mini Tests
        </h3>
        <p className="text-sm text-orange-700/80 mt-1">
          Her test 50 soru · 25 dakika. Aynı test numarası her seferinde aynı soruları getirir.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-orange-200 text-orange-700">
          {isPremium ? "✅ Premium unlocked" : `🔒 Free: first ${freeMiniCount}`}
        </span>
        <button
          type="button"
          onClick={() => setShowYds3750Hub(false)}
          className="text-xs font-bold px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-700 hover:bg-orange-100 transition shadow-sm"
        >
          Close Panel
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-8 gap-3">
      {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
        const locked = !isPremium && num > freeMiniCount;

        return (
          <button
            type="button"
            key={num}
            onClick={() => {
              if (locked) return;
              startTest(`yds-5000-mini-${num}`);
            }}
            disabled={locked}
            className={`py-4 rounded-xl font-black text-sm shadow-sm transition-all transform hover:scale-[1.03] active:scale-[0.98]
              ${
                locked
                  ? "bg-white text-orange-200 border border-orange-100 cursor-not-allowed opacity-60"
                  : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200 ring-2 ring-orange-200 ring-offset-2"
              }`}
            title={locked ? "Premium required" : "Start mini test"}
          >
            Test {num}
            <span className="block text-[10px] font-semibold opacity-90 mt-1">{locked ? "🔒 Locked" : "Start"}</span>
          </button>
        );
      })}
    </div>
  </div>
)}

          {/* OTHER MAIN TESTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {/* YDS EXAM PACK */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-pink-50 rounded-3xl p-6 border-2 border-pink-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 to-rose-500"></div>

              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-3">
                <h3 className="text-2xl font-black text-pink-600 flex items-center gap-2">
                  <span className="text-3xl">🇹🇷</span> YDS EXAM PACK
                </h3>
                <span className="text-pink-500 text-sm font-bold bg-white px-3 py-1 rounded-full border border-pink-100">
                  Real Exam Mode (80Q)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => {
                  const isActive = availableExamTests.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => isActive && startTest(`yds-exam-test-${num}`)}
                      disabled={!isActive}
                      className={`py-4 rounded-xl font-black text-lg shadow-sm transition-all transform hover:scale-105 active:scale-95
                        ${isActive
                          ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-200 ring-2 ring-pink-300 ring-offset-2'
                          : 'bg-white text-pink-300 border border-pink-100 cursor-not-allowed opacity-60'
                        }`}
                    >
                      Test {num}
                      {isActive && <span className="block text-xs font-semibold opacity-90 mt-1">Start Now</span>}
                      {!isActive && <span className="block text-[10px] opacity-60 mt-1">Locked</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => startTest(ydsGrammarTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-indigo-600 text-white text-xl font-black shadow-xl hover:bg-indigo-700 transition-all">
              {ydsGrammarTest.title}
            </button>

            <button onClick={() => startTest(ydsReadingTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-green-600 text-white text-xl font-black shadow-xl hover:bg-green-700 transition-all">
              {ydsReadingTest.title}
            </button>

            <button onClick={() => startTest(ydsPhrasalTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-teal-600 text-white text-xl font-black shadow-xl hover:bg-teal-700 transition-all">
              {ydsPhrasalTest.title}
            </button>

            <button onClick={() => startTest(ydsSynonymTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-purple-500 text-white text-xl font-black shadow-xl hover:bg-purple-600 transition-all">
              {ydsSynonymTest.title}
            </button>

            <button onClick={() => startTest(ydsConjunctionTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-slate-700 text-white text-xl font-black shadow-xl hover:bg-slate-800 transition-all">
              {ydsConjunctionTest.title}
            </button>

            <button onClick={() => startTest(ieltsTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-sky-500 text-white text-xl font-black shadow-xl hover:bg-sky-600 transition-all">
              {ieltsTest.title}
            </button>

            <button onClick={() => startTest(vocabTest.slug)} className="flex items-center justify-center px-6 py-8 rounded-2xl bg-emerald-600 text-white text-xl font-black shadow-xl hover:bg-emerald-700 transition-all">
              {vocabTest.title}
            </button>
          </div>

          {/* Grammar Focus */}
          <div className="mb-20">
            <div className="flex items-center justify-center mb-8">
              <span className="bg-white px-8 py-3 rounded-full text-slate-500 font-bold text-sm border border-slate-200 uppercase tracking-wider">
                Grammar Focus
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {grammarTests.map((test) => (
                <button
                  key={test.slug}
                  onClick={() => startTest(test.slug)}
                  className="group px-4 py-5 rounded-xl bg-white text-indigo-700 font-black shadow-sm border border-indigo-50 hover:border-indigo-300 hover:shadow-lg transition-all"
                >
                  <span className="block group-hover:scale-105 transition-transform">{test.title}</span>
                  <span className="block mt-1 text-[11px] font-semibold text-slate-400">20Q · timed</span>
                </button>
              ))}
            </div>
          </div>

          {/* All Levels */}
          <div className="mb-20">
            <div className="flex items-center justify-center mb-8">
              <span className="bg-white px-8 py-3 rounded-full text-slate-500 font-bold text-sm border border-slate-200 uppercase tracking-wider">
                All Levels
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {levelTests.map((test) => (
                <a
                  key={test.level}
                  href={`/levels/${test.level}`}
                  className="px-4 py-10 rounded-2xl bg-white text-slate-700 font-black text-3xl border border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-xl transition-all"
                >
                  {test.level}
                </a>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: Levels pages can be SEO landing pages. Add “20Q · 10 min · instant review” there.
            </div>
          </div>

          {/* SEO SECTION (same as yours, kept) */}
          <section className="text-left w-full border-t border-slate-200 pt-16 mt-16 pb-12 bg-slate-50">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center">
                    <span className="bg-orange-100 text-orange-600 p-2 rounded-lg mr-3 text-sm">🇹🇷</span>
                    YDS & YÖKDİL Exam Preparation
                  </h2>
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                    Preparing for the <strong>Foreign Language Exam (YDS)</strong> or <strong>YÖKDİL</strong> in Turkey? EnglishMeter offers comprehensive online practice tests designed to simulate the real exam experience.
                    Our <strong>YDS Exam Pack</strong> includes full-length practice tests with 80 questions covering reading comprehension, vocabulary, grammar, and translation skills.
                  </p>
                  <ul className="list-disc pl-4 text-sm text-slate-500 space-y-1">
                    <li><strong>YDS Vocabulary:</strong> Master the most common 3750 academic words.</li>
                    <li><strong>Synonyms Practice:</strong> Learn crucial synonyms and distractors for paraphrasing questions.</li>
                    <li><strong>Reading Comprehension:</strong> Analyze complex paragraphs with detailed explanations.</li>
                    <li><strong>Grammar Practice:</strong> Focus on tenses, prepositions, and sentence completion.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3 text-sm">🌍</span>
                    Global English Placement Tests
                  </h2>
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                    Test your English proficiency level with our free online placement tests. Based on the <strong>Common European Framework of Reference (CEFR)</strong>, our quizzes determine whether you are A1 (Beginner), B2 (Upper-Intermediate), or C2 (Advanced).
                    Whether you are preparing for IELTS, TOEFL, or just want to know your level, our <strong>Quick Placement Test</strong> gives you an instant score in under 20 minutes.
                  </p>
                  <p className="text-sm text-slate-500">
                    Join thousands of users improving their English daily with our grammar focus tests and vocabulary builders.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Why use EnglishMeter?</h3>
                <div className="grid sm:grid-cols-3 gap-6 text-sm text-slate-600">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Instant Results</h4>
                    <p>No waiting. Get your score, CEFR level, and detailed answer explanations immediately after finishing a test.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Mobile Friendly</h4>
                    <p>Practice on the go. Our tests are optimized for phones, tablets, and desktops so you can study anywhere.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Completely Free</h4>
                    <p>Access high-quality YDS, YÖKDİL, and general English grammar tests without any subscription fees.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tiny SEO-friendly link list (optional, crawler sees) */}
          <div className="sr-only">
            <Link href="/mistakes">Mistake Bank</Link>
            <Link href="/race">Race</Link>
            <Link href="/speedrun">SpeedRun</Link>
            <Link href="/flashcards">Flashcards</Link>
            <Link href="/matching">Matching</Link>
            <Link href="/verbsense">VerbSense</Link>
            <Link href="/speaking">Speaking</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home(props: any) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomeContent />
    </Suspense>
  );
}

// app/quiz/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/navigation';

// ✅ choices shuffle (sadece görüntü sırası)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...(array || [])];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- TYPES ---
interface Choice {
  id: string; // data id'si (değişmez)
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  prompt: string;
  choices: Choice[];
  explanation?: string;

  // ✅ AI sentence + translation (payload'dan gelir)
  s?: string | null;
  t?: string | null;

  // legacy / farklı datasetler için
  correctChoiceId?: string;
  correct?: string;
  correct_option?: string;
  answer?: string;
}

type QuestionWithShuffle = Question & { shuffledChoices: Choice[] };

interface TestInfo {
  title: string;
  duration?: number; // minutes
}

interface QuizData {
  attemptId: string;
  testSlug?: string;
  test: TestInfo;
  questions: Question[];
  error?: string;
}

// --- HELPER: FORMAT TIME MM:SS ---
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- HELPER: DOĞRU ŞIK ID'SİNİ BUL ---
function getCorrectChoiceId(q: Question): string | undefined {
  const flagged = (q.choices || []).find((c) => c.isCorrect);
  if (flagged) return String(flagged.id).trim();

  const anyQ = q as any;
  const candidate =
    q.correctChoiceId ??
    q.correct ??
    q.correct_option ??
    q.answer ??
    anyQ.correctAnswerId ??
    anyQ.correctAnswer;

  if (candidate != null) return String(candidate).trim();
  return undefined;
}

// --- HELPER: EQUAL ---
function idsEqual(a?: string | null, b?: string | null): boolean {
  if (a == null || b == null) return false;
  return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
}

// --- SAFE HTML RENDER (XSS PROTECTED) ---
function SafeHTML({ html }: { html: string }) {
  const clean = useMemo(() => {
    if (typeof window === 'undefined') return html;
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }, [html]);

  return <span dangerouslySetInnerHTML={{ __html: clean }} />;
}

// --- HELPER: TEXT FORMATTER (**badge** + safe html) ---
function formatText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      let content = part.slice(2, -2);
      content = content.replace(/^['"]+|['"]+$/g, '');
      return (
        <span
          key={index}
          className="bg-blue-100 text-blue-700 font-extrabold px-3 py-1 rounded-lg mx-1 border border-blue-200 shadow-sm inline-block transform -translate-y-0.5 tracking-wide"
        >
          {content}
        </span>
      );
    }
    return <SafeHTML key={index} html={part} />;
  });
}

/** Confetti burst:
 *  - 5 streak: small
 *  - 10 streak: big
 */
function MiniConfetti({ burst }: { burst: { key: number; level: 'small' | 'big' } | null }) {
  const intensity = burst?.level === 'big' ? 60 : 28;
  const size = burst?.level === 'big' ? 10 : 8;

  const pieces = useMemo(() => {
    const k = burst?.key ?? 0;
    if (!k) return [];
    return Array.from({ length: intensity }).map((_, i) => ({
      id: `${k}-${i}`,
      left: Math.random() * 100,
      drift: (Math.random() * 160 - 80).toFixed(1),
      delay: (Math.random() * 0.12).toFixed(2),
      dur: (burst?.level === 'big' ? 1.2 : 0.9 + Math.random() * 0.4).toFixed(2),
      rot: Math.floor(Math.random() * 360),
      hue: Math.floor(Math.random() * 360),
      w: size,
      h: burst?.level === 'big' ? size * 1.4 : size * 1.3,
    }));
  }, [burst?.key, burst?.level, intensity, size]);

  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!burst?.key) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), burst.level === 'big' ? 1400 : 1100);
    return () => window.clearTimeout(t);
  }, [burst?.key, burst?.level]);

  if (!show || pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-14px] rounded-sm opacity-95 confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: `hsl(${p.hue} 85% 55%)`,
              transform: `rotate(${p.rot}deg)`,
              '--dx': `${p.drift}px`,
              '--delay': `${p.delay}s`,
              '--dur': `${p.dur}s`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}

      <style jsx>{`
        .confetti-piece {
          animation: confetti-fall var(--dur) ease-out var(--delay) forwards;
          will-change: transform, opacity;
        }
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--rot));
          }
          100% {
            transform: translate3d(var(--dx), 105vh, 0) rotate(calc(var(--rot) + 560deg));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ✅ TTS helpers
function speak(text: string, lang = 'en-US', rate = 1) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  synth.speak(u);
}

function stripHtml(input: string) {
  if (typeof window === 'undefined') return input;
  const div = document.createElement('div');
  div.innerHTML = input;
  return div.textContent || div.innerText || '';
}

// ✅ AI box component + TTS
function AiSentenceBox({
  s,
  t,
  showSpeak = true,
  onSpeak,
}: {
  s?: string | null;
  t?: string | null;
  showSpeak?: boolean;
  onSpeak?: () => void;
}) {
  if (!s && !t) return null;

  return (
    <div className="mt-4 p-4 rounded-2xl border border-violet-200 bg-violet-50/40">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black text-violet-700 uppercase tracking-wide">AI Sentence</div>
        {showSpeak && s && (
          <button
            onClick={onSpeak}
            className="text-xs font-black px-3 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
            type="button"
          >
            🔊 Speak
          </button>
        )}
      </div>

      {s && (
        <div className="mt-2 text-sm font-semibold text-slate-900 leading-relaxed">
          <SafeHTML html={s} />
        </div>
      )}

      {t && (
        <div className="mt-2 text-sm text-slate-700 leading-relaxed">
          <SafeHTML html={t} />
        </div>
      )}
    </div>
  );
}

export default function Quiz({ params }: { params: { id: string } }) {
  const router = useRouter();

  // ✅ Hydration gate
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  // ✅ PRACTICE MODE STATE
  const [mode, setMode] = useState<'exam' | 'practice'>('exam');
  const [feedback, setFeedback] = useState<{ questionId: string; isCorrect: boolean } | null>(null);

  // ✅ PRACTICE LOCK (no trial & error streak)
  const [locked, setLocked] = useState<Record<string, boolean>>({});

  // ✅ STREAK + CONFETTI
  const [streak, setStreak] = useState(0);
  const [burst, setBurst] = useState<{ key: number; level: 'small' | 'big' } | null>(null);

  // ✅ Keyboard shortcuts: active question
  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ UX toggles
  const [autoScroll, setAutoScroll] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // ✅ GUARANTEED SCROLL (render sonrası)
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);
  const [pendingScrollMode, setPendingScrollMode] = useState<'after' | 'question' | null>(null);

  // ✅ Audio for correct/wrong (mobil uyumlu)
  const audioRef = useRef<AudioContext | null>(null);

  const ensureAudio = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AC) return;
      if (!audioRef.current) audioRef.current = new AC();
      if (audioRef.current.state === 'suspended') await audioRef.current.resume();
    } catch {}
  }, []);

  /**
   * ✅ Beep SFX
   * - ok: sine, kısa ve net
   * - bad: square, daha PES + DONUK (lowpass) => psikolojik uyarı
   */
  const beep = useCallback(
    async (kind: 'ok' | 'bad') => {
      if (!soundOn) return;
      await ensureAudio();
      const ctx = audioRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // ✅ "Donuk" etki için lowpass filter (bad)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(kind === 'bad' ? 520 : 8000, ctx.currentTime);
      filter.Q.setValueAtTime(kind === 'bad' ? 0.9 : 0.2, ctx.currentTime);

      if (kind === 'ok') {
        // ✅ OK: tatlı kısa sine
        osc.type = 'sine';
        osc.frequency.setValueAtTime(760, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.085);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else {
        // ✅ BAD: daha pes + donuk + square (daha "uyarıcı")
        osc.type = 'square';

        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

        filter.frequency.setValueAtTime(420, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.20);
      }
    },
    [ensureAudio, soundOn]
  );

  useEffect(() => setMounted(true), []);

  // ✅ Sticky header offset: top-4 bar + mobil
  const getScrollOffset = useCallback(() => {
    if (typeof window === 'undefined') return 140;
    return window.innerWidth < 640 ? 170 : 145;
  }, []);

  // ✅ GUARANTEED scroll (sticky bypass): window.scrollTo + offset
  const hardScrollTo = useCallback(
    (id: string) => {
      if (typeof window === 'undefined') return;
      const el = document.getElementById(id);
      if (!el) return;

      const y = el.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
      window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [getScrollOffset]
  );

  const scrollToQuestion = useCallback(
    (index: number) => {
      hardScrollTo(`q-${index}`);
    },
    [hardScrollTo]
  );

  const scrollToAfter = useCallback(
    (index: number) => {
      hardScrollTo(`q-${index}-after`);
    },
    [hardScrollTo]
  );

  // ✅ Render sonrası kesin kaydır
  useEffect(() => {
    if (pendingScrollIndex === null || pendingScrollMode === null) return;
    const t = window.setTimeout(() => {
      if (pendingScrollMode === 'question') scrollToQuestion(pendingScrollIndex);
      else scrollToAfter(pendingScrollIndex);
      setPendingScrollIndex(null);
      setPendingScrollMode(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [pendingScrollIndex, pendingScrollMode, scrollToAfter, scrollToQuestion]);

  // 1) LOAD DATA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = sessionStorage.getItem('em_attempt_payload');
    if (!raw) {
      router.replace('/?toast=attempt-expired');
      return;
    }

    try {
      const parsed: QuizData = JSON.parse(raw);
      setData(parsed);

      const qCount = parsed.questions?.length || 0;

      let seconds = 0;
      if (parsed.test?.duration && Number.isFinite(parsed.test.duration) && parsed.test.duration! > 0) {
        seconds = Math.round(parsed.test.duration! * 60);
      } else {
        seconds = qCount > 0 ? qCount * 30 : 25 * 60;
      }
      setTimeLeft(seconds);
    } catch {
      router.replace('/?toast=attempt-corrupted');
    }
  }, [params.id, router]);

  // ✅ data geldiğinde choices’ları 1 kez karıştır
  const questionsWithShuffledChoices: QuestionWithShuffle[] = useMemo(() => {
    if (!data?.questions) return [];
    return data.questions.map((q) => ({
      ...q,
      shuffledChoices: shuffleArray(q.choices || []),
    }));
  }, [data]);

  // ✅ remove session payload ONLY after result is visible
  useEffect(() => {
    if (showResult) {
      sessionStorage.removeItem('em_attempt_payload');
    }
  }, [showResult]);

  // 3) SUBMIT & SAVE MISTAKES
  const handleSubmit = useCallback(() => {
    if (!data) return;

    if (mode === 'exam') {
      const unanswered = data.questions.filter((q) => !answers[q.id]).length;
      if (unanswered > 0) {
        const ok = window.confirm(`${unanswered} unanswered question(s) var.\n\nYine de bitireyim mi? (Finish anyway)`);
        if (!ok) return;
      }
    }

    const { questions } = data;
    let correctCount = 0;

    const existingMistakesRaw = localStorage.getItem('my_mistakes');
    let mistakeList: any[] = [];
    try {
      mistakeList = existingMistakesRaw ? JSON.parse(existingMistakesRaw) : [];
      if (!Array.isArray(mistakeList)) mistakeList = [];
    } catch {
      mistakeList = [];
    }

    questions.forEach((q) => {
      const userAnswerId = answers[q.id];
      const correctChoiceId = getCorrectChoiceId(q);
      const isCorrect = idsEqual(userAnswerId, correctChoiceId);
      if (isCorrect) correctCount++;

      const scope = data.testSlug || data.attemptId || 'test';
      const mistakeKey = `${scope}::${q.id}`;

      if (userAnswerId) {
        if (isCorrect) {
          mistakeList = mistakeList.filter((m) => m?.key !== mistakeKey);
        } else {
          const alreadyExists = mistakeList.find((m) => m?.key === mistakeKey);
          if (!alreadyExists) {
            mistakeList.push({
              key: mistakeKey,
              questionId: q.id,
              attemptId: data.attemptId,
              testSlug: data.testSlug,
              testTitle: data.test.title,
              ...q,
              myWrongAnswer: userAnswerId,
              savedAt: new Date().toISOString(),
            });
          }
        }
      }
    });

    localStorage.setItem('my_mistakes', JSON.stringify(mistakeList));

    setScore(correctCount);
    setShowResult(true);
    window.scrollTo(0, 0);
  }, [data, answers, mode]);

  // 2) TIMER (EXAM ONLY)
  useEffect(() => {
    if (mode !== 'exam') return;
    if (timeLeft === null || showResult) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((p) => (p !== null && p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, showResult, handleSubmit, mode]);

  // 5) OPTIONAL: 10 seconds warning (EXAM only)
  useEffect(() => {
    if (mode !== 'exam') return;
    if (timeLeft === 10 && !showResult) {
      alert('⏳ 10 seconds left!');
    }
  }, [timeLeft, showResult, mode]);

  // Practice/Exam mode change: feedback + streak temizle
  useEffect(() => {
    setFeedback(null);
    setStreak(0);
    setBurst(null);
    setLocked({});
    setPendingScrollIndex(null);
    setPendingScrollMode(null);
  }, [mode]);

  // ✅ Keyboard shortcuts: 1-4 / A-D (shuffled choices üzerinden)
  useEffect(() => {
    if (!mounted) return;
    if (!data) return;
    if (showResult) return;

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const q = questionsWithShuffledChoices?.[activeIndex];
      if (!q) return;

      if (mode === 'practice' && locked[q.id]) return;

      const k = e.key.toLowerCase();
      const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
      if (!(k in map)) return;

      const ci = map[k];
      const choice = q.shuffledChoices?.[ci];
      if (!choice) return;

      setAnswers((prev) => ({ ...prev, [q.id]: choice.id }));

      if (mode === 'practice') {
        const realCorrectId = getCorrectChoiceId(q);
        const isCorrect = idsEqual(choice.id, realCorrectId);

        setFeedback({ questionId: q.id, isCorrect });
        setLocked((p) => ({ ...p, [q.id]: true }));

        void beep(isCorrect ? 'ok' : 'bad');

        if (isCorrect) {
          setStreak((s) => {
            const next = s + 1;
            if (next % 10 === 0) setBurst((b) => ({ key: (b?.key ?? 0) + 1, level: 'big' }));
            else if (next % 5 === 0) setBurst((b) => ({ key: (b?.key ?? 0) + 1, level: 'small' }));
            return next;
          });
        } else {
          setStreak(0);
        }

        if (autoScroll && isCorrect) {
          setPendingScrollIndex(activeIndex);
          setPendingScrollMode('after');
        }

        if (autoSpeak && q.s) {
          const plain = stripHtml(q.s || '');
          if (plain.trim()) window.setTimeout(() => speak(plain, 'en-US', 1), 120);
        }
      } else {
        const next = Math.min(activeIndex + 1, questionsWithShuffledChoices.length - 1);
        setActiveIndex(next);
        if (autoScroll) {
          setPendingScrollIndex(next);
          setPendingScrollMode('question');
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mounted,
    data,
    questionsWithShuffledChoices,
    activeIndex,
    mode,
    locked,
    showResult,
    autoScroll,
    autoSpeak,
    beep,
  ]);

  if (!mounted) return <div className="p-10 text-center animate-pulse">Loading...</div>;
  if (!data) return <div className="p-10 text-center animate-pulse">Loading...</div>;
  if (data.error) return <div className="p-10 text-red-600">{data.error}</div>;

  const questions = questionsWithShuffledChoices;
  const { test } = data;

  // ✅ Progress metrics
  const totalQ = questions.length || 1;
  const answeredCount = questions.filter((q) => !!answers[q.id]).length;
  const progress = Math.round((answeredCount / totalQ) * 100);

  // --- RESULT SCREEN ---
  if (showResult) {
    const total = questions.length || 1;
    const percentage = Math.round((score / total) * 100);

    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600" />
          <h1 className="text-3xl font-black text-slate-800 mb-2">Test Completed!</h1>

          <div className="flex justify-center items-center gap-4 sm:gap-8 mb-8 mt-6">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-blue-600">{score}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Correct</span>
            </div>

            <div className="w-px h-12 bg-slate-200" />

            <div className="flex flex-col">
              <span className="text-4xl font-black text-slate-700">{questions.length}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
            </div>

            <div className="w-px h-12 bg-slate-200" />

            <div className="flex flex-col">
              <span className={`text-4xl font-black ${percentage >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                {percentage}%
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase">Score</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {data.testSlug && (
              <button
                onClick={() => (window.location.href = `/?restart=${data.testSlug}`)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                type="button"
              >
                New Test (New Questions)
              </button>
            )}

            <a
              href="/"
              className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Back to Home
            </a>

            <Link
              href="/mistakes"
              className="px-6 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors border border-red-200 flex items-center justify-center gap-2"
            >
              <span>📕</span> My Mistakes
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-700 ml-2 border-l-4 border-blue-500 pl-3">Detailed Analysis</h2>

          {questions.map((q, idx) => {
            const userAnswerId = answers[q.id];
            const correctId = getCorrectChoiceId(q);
            const isUserAnswered = !!userAnswerId;
            const isCorrect = idsEqual(userAnswerId, correctId);

            let cardBorder = 'border-slate-200';
            let cardBg = 'bg-white';
            if (isCorrect) {
              cardBorder = 'border-green-200';
              cardBg = 'bg-green-50/40';
            } else if (!isUserAnswered) {
              cardBorder = 'border-amber-200';
              cardBg = 'bg-amber-50/40';
            } else {
              cardBorder = 'border-red-200';
              cardBg = 'bg-red-50/40';
            }

            const showPracticeExtras = mode === 'practice';

            return (
              <div key={q.id} className={`p-6 rounded-2xl border-2 ${cardBorder} ${cardBg}`}>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
                      isCorrect ? 'bg-green-500' : !isUserAnswered ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                  >
                    {isCorrect ? '✓' : !isUserAnswered ? '−' : '✕'}
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-slate-400 font-bold uppercase">Question {idx + 1}</span>
                      {!isUserAnswered && (
                        <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md">
                          SKIPPED
                        </span>
                      )}
                    </div>

                    <div className="text-lg font-medium text-slate-800 mb-5 leading-loose">{formatText(q.prompt)}</div>

                    <div className="grid gap-2">
                      {(q.shuffledChoices || q.choices || []).map((c, choiceIdx) => {
                        const isSelected = idsEqual(userAnswerId, c.id);
                        const isTheCorrectAnswer = idsEqual(c.id, correctId);
                        const choiceLetter = String.fromCharCode(65 + choiceIdx);

                        let optionClass = 'p-3 rounded-lg border flex items-center justify-between ';
                        if (isTheCorrectAnswer) {
                          optionClass += 'bg-green-100 border-green-300 text-green-800 font-bold shadow-sm';
                        } else if (isSelected) {
                          optionClass += 'bg-red-100 border-red-300 text-red-800 font-medium';
                        } else {
                          optionClass += 'bg-white/60 border-slate-200 text-slate-500 opacity-70';
                        }

                        return (
                          <div key={c.id} className={optionClass}>
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black ${
                                  isTheCorrectAnswer
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : isSelected
                                    ? 'border-red-500 bg-red-500 text-white'
                                    : 'border-slate-300 bg-white text-slate-500'
                                }`}
                              >
                                {choiceLetter}
                              </div>
                              <span>
                                <SafeHTML html={c.text} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {showPracticeExtras && (
                      <AiSentenceBox
                        s={q.s ?? null}
                        t={q.t ?? null}
                        onSpeak={() => {
                          const plain = stripHtml(q.s || '');
                          if (plain.trim()) speak(plain, 'en-US', 1);
                        }}
                      />
                    )}

                    {showPracticeExtras && q.explanation && (
                      <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3 items-start">
                        <span className="text-xl">💡</span>
                        <div>
                          <span className="font-bold block mb-1 text-blue-900">Explanation:</span>
                          <span className="leading-relaxed opacity-90">
                            <SafeHTML html={q.explanation} />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- QUIZ SOLVING SCREEN ---
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <MiniConfetti burst={burst} />

      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-20 backdrop-blur-sm bg-white/90">
        <div className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{test?.title || 'Test'}</div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 bg-slate-50">
            <button
              onClick={() => {
                void ensureAudio();
                setMode('exam');
              }}
              className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                mode === 'exam' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              type="button"
            >
              EXAM
            </button>

            <button
              onClick={() => {
                void ensureAudio();
                setMode('practice');
              }}
              className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                mode === 'practice' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              type="button"
            >
              PRACTICE
            </button>
          </div>

          {/* Practice toggles */}
          {mode === 'practice' && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setAutoScroll((v) => !v)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black border ${
                  autoScroll ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
                type="button"
                title="Auto scroll to feedback/AI section"
              >
                ⤓ Scroll {autoScroll ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => {
                  void ensureAudio();
                  setSoundOn((v) => !v);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black border ${
                  soundOn ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
                type="button"
                title="Correct/Wrong sound"
              >
                🔔 Sound {soundOn ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => setAutoSpeak((v) => !v)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black border ${
                  autoSpeak ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
                type="button"
                title="Auto speak AI sentence"
              >
                🗣️ Speak {autoSpeak ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          {/* Streak (practice only) */}
          {mode === 'practice' && (
            <div className="text-xs font-black text-orange-600 select-none" title="Correct streak">
              🔥 {streak}
            </div>
          )}

          {/* Timer */}
          <div
            className={`text-lg font-bold px-4 py-2 rounded-lg border transition-colors ${
              mode === 'exam' && timeLeft !== null && timeLeft < 60
                ? 'text-red-600 bg-red-50 border-red-200 animate-pulse'
                : 'text-blue-600 bg-blue-50 border-blue-200'
            }`}
          >
            {mode === 'practice' ? '∞' : timeLeft !== null ? formatTime(timeLeft) : '∞'}
          </div>
        </div>
      </div>

      {/* ✅ Progress Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-600 mb-2">
          <span>
            {answeredCount}/{totalQ} answered
          </span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ✅ Question Navigator */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-black text-slate-800">Question Navigator</div>
          <div className="text-xs text-slate-500">Blue = answered · White = empty</div>
        </div>

        <div className="grid grid-cols-10 gap-2">
          {questions.map((q, i) => {
            const done = !!answers[q.id];
            const isActive = i === activeIndex;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveIndex(i);
                  setPendingScrollIndex(i);
                  setPendingScrollMode('question');
                }}
                className={`h-8 rounded-lg text-xs font-black border transition active:scale-[0.98]
                  ${
                    done
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                  } ${isActive ? 'ring-2 ring-blue-200' : ''}`}
                title={done ? 'Answered' : 'Not answered'}
                type="button"
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions Loop */}
      <div className="space-y-8">
        {questions.map((q, idx) => {
          const correctId = mode === 'practice' ? getCorrectChoiceId(q) : undefined;
          const showThisFeedback = mode === 'practice' && feedback?.questionId === q.id;

          const hasAi = !!q.s || !!q.t;

          const showPracticeAi = mode === 'practice' && !!answers[q.id] && hasAi;
          const showPracticeExplanation = mode === 'practice' && !!answers[q.id] && !!q.explanation;

          const isLocked = mode === 'practice' && !!locked[q.id];

          return (
            <div
              id={`q-${idx}`}
              key={q.id}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              tabIndex={0}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 scroll-mt-28 outline-none focus:ring-2 focus:ring-blue-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-400 font-bold uppercase tracking-wide">Question {idx + 1}</div>
                {!answers[q.id] && (
                  <span className="text-[11px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-lg border border-slate-200">
                    EMPTY
                  </span>
                )}
                {isLocked && (
                  <span className="text-[11px] font-black px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                    LOCKED
                  </span>
                )}
              </div>

              <div className="text-xl font-medium text-slate-800 mb-6 leading-loose">{formatText(q.prompt)}</div>

              <div className="grid gap-3">
                {(q.shuffledChoices || q.choices || []).map((c, choiceIdx) => {
                  const selected = answers[q.id] === c.id;
                  const choiceLetter = String.fromCharCode(65 + choiceIdx); // A,B,C,D

                  const isCorrectChoice = mode === 'practice' && correctId ? idsEqual(c.id, correctId) : false;
                  const isWrongSelected = mode === 'practice' && showThisFeedback && selected && !isCorrectChoice;

                  const practiceRing =
                    mode === 'practice' && showThisFeedback
                      ? isCorrectChoice
                        ? 'border-green-500 bg-green-50'
                        : isWrongSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-100'
                      : selected
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50';

                  return (
                    <label
                      key={c.id}
                      className={`group flex items-center p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.99]
                        ${practiceRing} ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                      onClick={() => void ensureAudio()}
                    >
                      {/* ✅ A/B/C/D balonu */}
                      <div
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mr-4 text-[12px] font-black transition-colors
                          ${
                            selected
                              ? 'border-blue-600 text-blue-700 bg-blue-50'
                              : 'border-slate-300 text-slate-500 group-hover:border-blue-400'
                          }`}
                      >
                        {choiceLetter}
                      </div>

                      <input
                        type="radio"
                        name={q.id}
                        className="hidden"
                        checked={selected}
                        onChange={() => {
                          if (mode === 'practice' && locked[q.id]) return;

                          setAnswers((prev) => ({ ...prev, [q.id]: c.id }));

                          if (mode === 'practice') {
                            const realCorrectId = getCorrectChoiceId(q);
                            const isCorrect = idsEqual(c.id, realCorrectId);

                            setFeedback({ questionId: q.id, isCorrect });
                            setLocked((p) => ({ ...p, [q.id]: true }));

                            void beep(isCorrect ? 'ok' : 'bad');

                            if (isCorrect) {
                              setStreak((s) => {
                                const next = s + 1;
                                if (next % 10 === 0) setBurst((b) => ({ key: (b?.key ?? 0) + 1, level: 'big' }));
                                else if (next % 5 === 0) setBurst((b) => ({ key: (b?.key ?? 0) + 1, level: 'small' }));
                                return next;
                              });
                            } else {
                              setStreak(0);
                            }

                            // ✅ PRACTICE: sadece doğruysa aşağı kay
                            if (autoScroll && isCorrect) {
                              setPendingScrollIndex(idx);
                              setPendingScrollMode('after');
                            }

                            if (autoSpeak && q.s) {
                              const plain = stripHtml(q.s || '');
                              if (plain.trim()) window.setTimeout(() => speak(plain, 'en-US', 1), 120);
                            }
                          } else {
                            // ✅ EXAM: seçince sonraki soruya geç
                            const next = Math.min(idx + 1, questions.length - 1);
                            setActiveIndex(next);
                            if (autoScroll) {
                              setPendingScrollIndex(next);
                              setPendingScrollMode('question');
                            }
                          }
                        }}
                      />

                      <span className={`text-lg ${selected ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                        <SafeHTML html={c.text} />
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* ✅ PRACTICE FEEDBACK */}
              {mode === 'practice' && showThisFeedback && (
                <div
                  className={`mt-4 p-4 rounded-xl border font-bold ${
                    feedback?.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {feedback?.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                </div>
              )}

              {/* ✅ PRACTICE ONLY: AI sentence after answering */}
              {showPracticeAi && (
                <AiSentenceBox
                  s={q.s ?? null}
                  t={q.t ?? null}
                  onSpeak={() => {
                    const plain = stripHtml(q.s || '');
                    if (plain.trim()) speak(plain, 'en-US', 1);
                  }}
                />
              )}

              {/* ✅ PRACTICE ONLY: Explanation after answering */}
              {showPracticeExplanation && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3 items-start">
                  <span className="text-xl">💡</span>
                  <div>
                    <span className="font-bold block mb-1 text-blue-900">Explanation:</span>
                    <span className="leading-relaxed opacity-90">
                      <SafeHTML html={q.explanation!} />
                    </span>
                  </div>
                </div>
              )}

              {/* ✅ anchor */}
              <div id={`q-${idx}-after`} className="h-1" />

              {/* Quick actions */}
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={() => {
                    setAnswers((prev) => {
                      const copy = { ...prev };
                      delete copy[q.id];
                      return copy;
                    });
                    setLocked((p) => {
                      const copy = { ...p };
                      delete copy[q.id];
                      return copy;
                    });
                    if (mode === 'practice') setFeedback(null);
                  }}
                  className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  type="button"
                >
                  Clear answer
                </button>

                <button
                  onClick={() => {
                    const next = Math.min(idx + 1, questions.length - 1);
                    setActiveIndex(next);
                    setPendingScrollIndex(next);
                    setPendingScrollMode('question');
                  }}
                  className="text-xs font-black px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  type="button"
                >
                  Next →
                </button>
              </div>

              {idx === 0 && (
                <div className="mt-4 text-xs text-slate-400">
                  ⌨️ Keyboard: Use <b>1-4</b> or <b>A-D</b> to answer the active question.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 pb-12">
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl text-white text-xl font-bold shadow-lg transition-all transform active:scale-[0.98] bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200"
          type="button"
        >
          Finish Test
        </button>

        <div className="mt-3 text-center text-xs text-slate-400">
          Tip:{' '}
          {mode === 'exam'
            ? 'Exam: you can finish anytime. If some are empty, it will ask “Finish anyway?”.'
            : 'Practice: instant feedback + lock + streak confetti + scroll + sound + speak!'}
        </div>
      </div>
    </div>
  );
}

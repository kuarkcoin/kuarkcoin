'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import vocabRaw from '@/data/yds_vocabulary.json';

type VocabItem = { word: string; meaning: string };
type Side = 'left' | 'right';

type Card = {
  key: string;
  pairId: string;
  side: Side;
  text: string;
  locked: boolean;
};

type ToastKind = 'ok' | 'bad' | 'info';

type SwipeState = {
  startX: number;
  startY: number;
  startT: number;
  cardKey: string;
  side: Side;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clean(s: string) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeVocab(list: any): VocabItem[] {
  const raw = Array.isArray(list) ? list : [];
  const out: VocabItem[] = [];
  for (const it of raw) {
    const w = String(it?.word || '').trim();
    const m = String(it?.meaning || '').trim();
    if (!w || !m) continue;
    out.push({ word: w, meaning: m });
  }
  return out;
}

function pickUniquePairs(pool: VocabItem[], count: number) {
  const seen = new Set<string>();
  const shuffled = shuffle(pool);
  const picked: VocabItem[] = [];
  for (const it of shuffled) {
    const k = clean(it.word);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    picked.push(it);
    if (picked.length >= count) break;
  }
  return picked;
}

/** 🔊 TTS (Browser SpeechSynthesis) */
function speak(text: string, lang: 'en-US' | 'en-GB' = 'en-US', rate = 0.95) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth || !text) return;

  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;
  utter.pitch = 1;

  const voices = synth.getVoices ? synth.getVoices() : [];
  const voice =
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang?.startsWith('en'));
  if (voice) utter.voice = voice;

  synth.speak(utter);
}

export default function MatchingPage() {
  const vocab = useMemo(() => safeVocab(vocabRaw as any), []);

  // Settings
  const TARGET_PAIRS = 8;
  const ROUND_SECONDS = 60;

  // Render behavior:
  // true  => locked cards animate (opacity/scale) but still occupy space briefly
  // false => locked cards are removed from DOM immediately (faster, no “gaps”)
  const KEEP_LOCKED_IN_DOM_FOR_ANIM = true;

  // Game state
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(true);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);

  const [leftCards, setLeftCards] = useState<Card[]>([]);
  const [rightCards, setRightCards] = useState<Card[]>([]);

  const [selectedLeft, setSelectedLeft] = useState<Card | null>(null);
  const [selectedRight, setSelectedRight] = useState<Card | null>(null);

  const [toast, setToast] = useState<{ kind: ToastKind; text: string } | null>(null);
  const [shakeKey, setShakeKey] = useState<string>('');

  // Voice settings
  const [accent, setAccent] = useState<'en-US' | 'en-GB'>('en-US');
  const [rate, setRate] = useState<number>(0.95);
  const [autoSpeakCorrect, setAutoSpeakCorrect] = useState<boolean>(true);

  // Refs for safety
  const finishOnceRef = useRef(false);
  const swipeRef = useRef<SwipeState | null>(null);

  // Prevent double match / race conditions
  const matchLockRef = useRef(false);

  const lockedCount = useMemo(() => leftCards.filter((c) => c.locked).length, [leftCards]);
  const finished = leftCards.length > 0 && leftCards.every((c) => c.locked);

  function startNewRound(nextRound: number) {
    if (vocab.length === 0) {
      setToast({ kind: 'bad', text: 'Kelime listesi boş. data/yds_vocabulary.json kontrol et.' });
      setRunning(false);
      return;
    }

    finishOnceRef.current = false;
    matchLockRef.current = false;

    const picked = pickUniquePairs(vocab, TARGET_PAIRS);

    if (picked.length === 0) {
      setToast({ kind: 'bad', text: 'Yeterli kelime bulunamadı!' });
      setRunning(false);
      return;
    }

    const left: Card[] = picked.map((p, i) => ({
      key: `L-${nextRound}-${i}-${clean(p.word)}`,
      pairId: `P-${nextRound}-${i}-${clean(p.word)}`,
      side: 'left',
      text: p.word,
      locked: false,
    }));

    const right: Card[] = picked.map((p, i) => ({
      key: `R-${nextRound}-${i}-${clean(p.word)}`,
      pairId: `P-${nextRound}-${i}-${clean(p.word)}`,
      side: 'right',
      text: p.meaning,
      locked: false,
    }));

    setLeftCards(shuffle(left));
    setRightCards(shuffle(right));

    setSelectedLeft(null);
    setSelectedRight(null);
    setShakeKey('');

    setTimeLeft(ROUND_SECONDS);
    setLives(5);
    setStreak(0);
    setRunning(true);

    setToast({ kind: 'info', text: `Round ${nextRound} başladı! (${picked.length} çift)` });
  }

  // Init
  useEffect(() => {
    startNewRound(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // voices warm-up (helps some mobile browsers)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    const warm = () => {
      try {
        synth.getVoices?.();
      } catch {}
    };

    warm();
    // @ts-ignore
    synth.onvoiceschanged = warm;

    return () => {
      // @ts-ignore
      synth.onvoiceschanged = null;
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;

    if (timeLeft <= 0) {
      setRunning(false);
      setToast({ kind: 'bad', text: 'Süre bitti! Restart veya Next Round.' });
      return;
    }

    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running, timeLeft]);

  // Finish bonus (safe once)
  useEffect(() => {
    if (finished && running && !finishOnceRef.current) {
      finishOnceRef.current = true;
      setRunning(false);

      const timeBonus = clamp(timeLeft, 0, 90);
      setScore((s) => s + timeBonus);

      setToast({ kind: 'ok', text: `Tur bitti! Süre Bonusu: +${timeBonus}` });
    }
  }, [finished, running, timeLeft]);

  // Lives end
  useEffect(() => {
    if (lives <= 0 && running) {
      setRunning(false);
      setToast({ kind: 'bad', text: 'Can bitti! Restart veya Next Round.' });
    }
  }, [lives, running]);

  // Match processing (single entry point)
  function handleMatch(left: Card, right: Card) {
    if (!running) return;
    if (left.locked || right.locked) return;

    // hard lock to prevent “double scoring”
    if (matchLockRef.current) return;
    matchLockRef.current = true;

    const isMatch = left.pairId === right.pairId;

    if (isMatch) {
      setLeftCards((prev) => prev.map((c) => (c.key === left.key ? { ...c, locked: true } : c)));
      setRightCards((prev) => prev.map((c) => (c.key === right.key ? { ...c, locked: true } : c)));

      setScore((s) => s + 10 + Math.min(streak, 10));
      setStreak((x) => x + 1);
      setToast({ kind: 'ok', text: 'Doğru!' });

      if (autoSpeakCorrect) speak(left.text, accent, rate);
    } else {
      setLives((l) => Math.max(0, l - 1));
      setScore((s) => Math.max(0, s - 5));
      setStreak(0);
      setToast({ kind: 'bad', text: 'Yanlış eşleşme!' });
      setShakeKey(left.key + '|' + right.key);
    }

    // clear selection after short delay (for shake/feedback)
    setTimeout(() => {
      setSelectedLeft(null);
      setSelectedRight(null);
      setShakeKey('');
      matchLockRef.current = false;
    }, 320);
  }

  // Tap pick
  function onPick(card: Card) {
    if (!running || card.locked) return;

    if (card.side === 'left') {
      if (selectedLeft?.key === card.key) return;
      setSelectedLeft(card);

      if (selectedRight && !selectedRight.locked) {
        handleMatch(card, selectedRight);
      }
    } else {
      if (selectedRight?.key === card.key) return;
      setSelectedRight(card);

      if (selectedLeft && !selectedLeft.locked) {
        handleMatch(selectedLeft, card);
      }
    }
  }

  function nextRound() {
    const nr = round + 1;
    setRound(nr);
    startNewRound(nr);
  }

  function restartRound() {
    startNewRound(round);
  }

  /* ===================== SWIPE =====================
     Primary UX:
       1) Select left (English) with tap
       2) Swipe RIGHT on a Turkish card to match
     Secondary (optional):
       - If Turkish selected, swipe LEFT on English to match
  =================================================== */
  function onTouchStart(e: React.TouchEvent, card: Card) {
    if (!running || card.locked) return;
    const t = e.touches[0];
    swipeRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      startT: Date.now(),
      cardKey: card.key,
      side: card.side,
    };
  }

  function onTouchEnd(e: React.TouchEvent, card: Card) {
    if (!running || card.locked) return;

    const st = swipeRef.current;
    swipeRef.current = null;
    if (!st || st.cardKey !== card.key) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    const dt = Date.now() - st.startT;

    const H = 40; // min horizontal
    const V = 35; // max vertical (avoid scroll)
    const TMAX = 650;

    if (Math.abs(dy) > V || dt > TMAX) return;

    // RIGHT side: swipe RIGHT (→) to match with selectedLeft
    if (card.side === 'right' && dx > H) {
      if (!selectedLeft) {
        setToast({ kind: 'info', text: 'Önce soldan İngilizce kelimeyi seç.' });
        return;
      }
      // ensure right is selected (visual)
      setSelectedRight(card);
      handleMatch(selectedLeft, card);
      return;
    }

    // LEFT side: swipe LEFT (←) to match with selectedRight
    if (card.side === 'left' && dx < -H) {
      if (!selectedRight) {
        setToast({ kind: 'info', text: 'Önce sağdan Türkçe anlamı seç.' });
        return;
      }
      setSelectedLeft(card);
      handleMatch(card, selectedRight);
      return;
    }
  }

  const toastCls =
    toast?.kind === 'ok'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : toast?.kind === 'bad'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  const baseBtn =
    'px-4 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50 font-semibold transition';

  // Unified card base (mobile-first)
  const cardBaseClass =
    'relative w-full text-left px-2 py-2 rounded-xl border select-none transition-all duration-300 ease-out will-change-transform';

  // Filter locked cards (if not keeping for animation)
  const leftRender = KEEP_LOCKED_IN_DOM_FOR_ANIM ? leftCards : leftCards.filter((c) => !c.locked);
  const rightRender = KEEP_LOCKED_IN_DOM_FOR_ANIM ? rightCards : rightCards.filter((c) => !c.locked);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className={baseBtn}>
              ← Home
            </Link>
            <div>
              <div className="text-lg font-black text-slate-900">Matching Game</div>
              <div className="text-xs text-slate-500">
                Sol EN • Sağ TR • Tap veya Swipe (EN seç → TR kartı sağa kaydır)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              ⏱️ <span className="font-bold">{timeLeft}s</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              🎯 <span className="font-bold">{score}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              🔥 <span className="font-bold">{streak}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              ❤️ <span className="font-bold">{lives}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              ✅ <span className="font-bold">{lockedCount}</span>/{leftCards.length || TARGET_PAIRS}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5">
        {/* Toast */}
        {toast && (
          <div className={`mb-3 p-3 rounded-2xl border ${toastCls}`}>
            <div className="text-sm font-semibold">{toast.text}</div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className={baseBtn}
              disabled={finished || lives <= 0}
              title="Pause / Resume"
            >
              {running ? 'Pause' : 'Resume'}
            </button>

            <button onClick={restartRound} className={baseBtn}>
              Restart
            </button>

            <button
              onClick={nextRound}
              className="px-4 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-semibold transition"
            >
              Next Round →
            </button>
          </div>

          {/* Voice controls */}
          <div className="rounded-3xl border border-slate-200 p-3 flex flex-wrap items-center gap-2 justify-between">
            <div className="text-sm font-black text-slate-900">Ses</div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAccent('en-US')}
                className={`px-2 py-1 rounded-xl border text-xs font-semibold transition ${
                  accent === 'en-US'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                🇺🇸 US
              </button>

              <button
                onClick={() => setAccent('en-GB')}
                className={`px-2 py-1 rounded-xl border text-xs font-semibold transition ${
                  accent === 'en-GB'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                🇬🇧 GB
              </button>

              <label className="text-xs text-slate-600 flex items-center gap-2">
                Hız
                <input
                  type="range"
                  min={0.7}
                  max={1.2}
                  step={0.05}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-20"
                />
                <span className="font-semibold text-slate-900 w-10 text-right">{rate.toFixed(2)}</span>
              </label>

              <label className="text-xs text-slate-600 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSpeakCorrect}
                  onChange={(e) => setAutoSpeakCorrect(e.target.checked)}
                />
                Oto oku
              </label>

              <button
                onClick={() => {
                  speak('Let’s begin!', accent, rate);
                  setToast({ kind: 'info', text: 'Ses test edildi.' });
                }}
                className="px-3 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50 font-semibold transition text-xs"
                title="Ses testi"
              >
                🔊 Test
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center">
            Swipe: Soldan seç → sağ kartı <span className="font-bold mx-1">sağa kaydır (→)</span>.
          </div>
        </div>

        {/* ✅ Always 2 columns (mobile-first) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left column */}
          <div className="rounded-3xl border border-slate-200 p-3 bg-slate-50/50">
            <div className="text-xs font-black text-slate-900 mb-2">English</div>

            <div className="grid grid-cols-1 gap-2">
              {leftRender.map((c) => {
                const selected = selectedLeft?.key === c.key;
                const shaking = shakeKey.includes(c.key) && !c.locked ? 'animate-[shake_.28s_linear_1]' : '';

                let cls = '';
                if (c.locked) {
                  // fade-out + scale-down + disable
                  cls =
                    'bg-emerald-100/40 border-emerald-200 text-emerald-800 opacity-0 scale-95 pointer-events-none';
                } else if (selected) {
                  cls = 'bg-slate-900 border-slate-900 text-white scale-[1.02] shadow-md';
                } else {
                  cls = 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-900';
                }

                return (
                  <div
                    key={c.key}
                    onClick={() => onPick(c)}
                    onTouchStart={(e) => onTouchStart(e, c)}
                    onTouchEnd={(e) => onTouchEnd(e, c)}
                    className={`${cardBaseClass} ${cls} ${shaking}`}
                    style={{ pointerEvents: !running || c.locked ? 'none' : 'auto' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[13px] leading-tight break-words">
                        {c.text}
                      </span>

                      {!c.locked && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(c.text, accent, rate);
                          }}
                          className={`shrink-0 px-2 py-1 rounded-lg border text-[12px] font-semibold transition ${
                            selected
                              ? 'border-white/30 text-white/90 hover:text-white hover:border-white/50'
                              : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                          title="Dinle"
                        >
                          🔊
                        </span>
                      )}
                    </div>

                    {/* subtle hint overlay when opposite side selected */}
                    {selectedRight && !c.locked && !selected && (
                      <div className="absolute inset-0 bg-slate-900/5 rounded-xl pointer-events-none animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="rounded-3xl border border-slate-200 p-3 bg-slate-50/50">
            <div className="text-xs font-black text-slate-900 mb-2">Türkçe</div>

            <div className="grid grid-cols-1 gap-2">
              {rightRender.map((c) => {
                const selected = selectedRight?.key === c.key;
                const shaking = shakeKey.includes(c.key) && !c.locked ? 'animate-[shake_.28s_linear_1]' : '';

                let cls = '';
                if (c.locked) {
                  cls =
                    'bg-emerald-100/40 border-emerald-200 text-emerald-800 opacity-0 scale-95 pointer-events-none';
                } else if (selected) {
                  cls = 'bg-slate-900 border-slate-900 text-white scale-[1.02] shadow-md';
                } else {
                  cls = 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-900';
                }

                return (
                  <div
                    key={c.key}
                    onClick={() => onPick(c)}
                    onTouchStart={(e) => onTouchStart(e, c)}
                    onTouchEnd={(e) => onTouchEnd(e, c)}
                    className={`${cardBaseClass} ${cls} ${shaking}`}
                    style={{ pointerEvents: !running || c.locked ? 'none' : 'auto' }}
                  >
                    <div className="font-semibold text-[13px] leading-tight break-words w-full">
                      {c.text}
                    </div>

                    {/* hint overlay when left selected */}
                    {!c.locked && selectedLeft && !selected && (
                      <div className="absolute inset-0 bg-slate-900/5 rounded-xl pointer-events-none animate-pulse" />
                    )}

                    {/* swipe hint text */}
                    {!c.locked && selectedLeft && (
                      <div className={`mt-1 text-[11px] ${selected ? 'text-white/70' : 'text-slate-400'}`}>
                        → swipe to match
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-[11px] text-slate-500 text-center">
          Round <span className="font-bold">{round}</span> • Havuz: {vocab.length} kelime •
          Sol EN / Sağ TR • Tap veya Swipe
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
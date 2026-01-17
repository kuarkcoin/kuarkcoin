// app/flashcards/page.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import fullWordList from '@/data/yds_vocabulary.json';

type WordItem = { word: string; meaning: string };

type DeckItem = WordItem & {
  id: string;
  seenCount: number;

  // ✅ Lazy sentence cache (LocalStorage'a da kaydolur)
  sentenceEn?: string;
  sentenceTr?: string;
  sentenceNoteTr?: string;
  sentenceLoading?: boolean;
  sentenceError?: string;
};

type Stats = {
  seenTotal: number;
};

const STORAGE_KEY = 'testdunya_flashcards_voice_5000';

const makeId = (w: WordItem) => `${w.word}|||${w.meaning}`.toLowerCase();

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* 🔊 Speech */
function speak(text: string, lang: 'en-US' | 'en-GB') {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function FlashcardsPage() {
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [accent, setAccent] = useState<'en-US' | 'en-GB'>('en-US');
  const [stats, setStats] = useState<Stats>({ seenTotal: 0 });

  const lock = useRef(false);

  /* LOAD */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.deck) && parsed.deck.length) {
          setDeck(parsed.deck);
          setIndex(parsed.index ?? 0);
          setStats(parsed.stats ?? { seenTotal: 0 });
          setAccent(parsed.accent ?? 'en-US');
          return;
        }
      }
    } catch {}

    const base: DeckItem[] = shuffle(fullWordList as WordItem[]).map((w) => ({
      ...w,
      id: makeId(w),
      seenCount: 0,
      sentenceEn: '',
      sentenceTr: '',
      sentenceNoteTr: '',
      sentenceLoading: false,
      sentenceError: '',
    }));

    setDeck(base);
  }, []);

  /* SAVE */
  useEffect(() => {
    if (!deck.length) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ deck, index, stats, accent })
      );
    } catch {}
  }, [deck, index, stats, accent]);

  const total = deck.length;
  const card = deck[index];

  /* ✅ AUTO SPEAK — yalnızca yeni karta geçince */
useEffect(() => {
  if (!card?.word) return;

  // önce eski sesi kesin
  window.speechSynthesis.cancel();

  // index gerçekten güncellendikten sonra okut
  const t = setTimeout(() => {
    speak(card.word, accent);
  }, 60); // 🔑 kritik gecikme

  return () => clearTimeout(t);
}, [index, accent]);
  const next = useCallback(() => {
    if (!total || lock.current) return;
    lock.current = true;
    setIsFlipped(false);

    if ('vibrate' in navigator) navigator.vibrate(10);

    setDeck((d) =>
      d.map((c, i) => (i === index ? { ...c, seenCount: c.seenCount + 1 } : c))
    );
    setStats((s) => ({ seenTotal: s.seenTotal + 1 }));

    setTimeout(() => {
      setIndex((i) => (i + 1) % total);
      lock.current = false;
    }, 180);
  }, [index, total]);

  const prev = useCallback(() => {
    setIsFlipped(false);
    setIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);

  // ✅ Lazy sentence generator (button ile)
  const genSentence = useCallback(async () => {
    if (!card) return;

    // varsa tekrar üretme
    if (card.sentenceEn && card.sentenceTr) return;

    setDeck((d) =>
      d.map((c, i) =>
        i === index ? { ...c, sentenceLoading: true, sentenceError: '' } : c
      )
    );

    try {
      const res = await fetch('/api/flashcards/sentence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word: card.word, meaning: card.meaning }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Sentence üretilemedi');

      setDeck((d) =>
        d.map((c, i) =>
          i === index
            ? {
                ...c,
                sentenceEn: String(data.en || ''),
                sentenceTr: String(data.tr || ''),
                sentenceNoteTr: String(data.note_tr || ''),
                sentenceLoading: false,
                sentenceError: '',
              }
            : c
        )
      );
    } catch (err: any) {
      setDeck((d) =>
        d.map((c, i) =>
          i === index
            ? {
                ...c,
                sentenceLoading: false,
                sentenceError: err?.message || 'Hata',
              }
            : c
        )
      );
    }
  }, [card, index]);

  const resetSentence = useCallback(() => {
    setDeck((d) =>
      d.map((c, i) =>
        i === index
          ? {
              ...c,
              sentenceEn: '',
              sentenceTr: '',
              sentenceNoteTr: '',
              sentenceError: '',
              sentenceLoading: false,
            }
          : c
      )
    );
  }, [index]);

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* TOP */}
      <div className="w-full max-w-md mx-auto flex justify-between items-center px-4 pt-4">
        <Link href="/" className="text-slate-500 font-bold">
          ← Exit
        </Link>
        <div className="text-xs text-slate-400 font-semibold">
          {index + 1} / {total}
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center px-4 pb-28">
        {/* CARD */}
        <div
          className="w-full h-[22rem] perspective-1000 cursor-pointer select-none"
          onClick={() => {
            if ('vibrate' in navigator) navigator.vibrate(12);
            setIsFlipped((v) => !v);
          }}
        >
          <div
            className={`tok relative w-full h-full transition-transform duration-300 transform-style-3d ${
              isFlipped ? 'rotate-y-180 scale-[0.98]' : 'scale-100'
            }`}
          >
            {/* FRONT */}
            <div className="absolute w-full h-full bg-white rounded-3xl shadow-xl backface-hidden flex flex-col items-center justify-center p-8">
              <h2 className="text-4xl font-black text-slate-900 text-center break-words">
                {card.word}
              </h2>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(card.word, accent);
                  }}
                  className="px-5 py-2 rounded-full bg-emerald-100 text-emerald-700 font-bold active:scale-95"
                >
                  🔊 Pronounce
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccent(accent === 'en-US' ? 'en-GB' : 'en-US');
                  }}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-bold active:scale-95"
                >
                  {accent === 'en-US' ? '🇺🇸 US' : '🇬🇧 UK'}
                </button>
              </div>

              <p className="mt-6 text-slate-400 text-sm">Tap to flip ↻</p>
            </div>

            {/* BACK */}
            <div className="absolute w-full h-full bg-emerald-600 text-white rounded-3xl shadow-xl backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 gap-4">
              <h2 className="text-3xl font-black text-center break-words">
                {card.meaning}
              </h2>

              {/* ✅ AL Sentence Area */}
              <div className="w-full rounded-2xl bg-white/10 p-4 text-sm">
                {!card.sentenceEn ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      genSentence();
                    }}
                    disabled={!!card.sentenceLoading}
                    className="w-full px-4 py-3 rounded-xl bg-white text-emerald-700 font-black active:scale-[0.99] disabled:opacity-60"
                  >
                    {card.sentenceLoading ? '⏳ Üretiliyor...' : '✨ AL Sentence (EN + TR)'}
                  </button>
                ) : (
                  <>
                    <div className="font-extrabold">EN</div>
                    <div className="font-semibold">{card.sentenceEn}</div>

                    <div className="mt-3 font-extrabold">TR</div>
                    <div className="opacity-95">{card.sentenceTr}</div>

                    {card.sentenceNoteTr ? (
                      <div className="mt-3 opacity-80">📝 {card.sentenceNoteTr}</div>
                    ) : null}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSentence();
                      }}
                      className="mt-3 text-xs underline opacity-80"
                    >
                      Yeniden üret
                    </button>
                  </>
                )}

                {card.sentenceError ? (
                  <div className="mt-3 text-xs opacity-90">⚠️ {card.sentenceError}</div>
                ) : null}
              </div>

              <p className="text-white/70 text-xs">Tap to flip ↻</p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="mt-4 text-xs text-slate-500">Seen: {stats.seenTotal}</div>
      </div>

      {/* STICKY CONTROLS */}
      <div className="sticky bottom-0 w-full bg-slate-50/95 backdrop-blur border-t border-slate-200">
        <div className="w-full max-w-md mx-auto px-4 py-3">
          <div className="flex gap-3">
            <button onClick={prev} className="flex-1 btn">
              ← Prev
            </button>
            <button onClick={next} className="flex-1 btn btn-dark">
              Next →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .btn {
          padding: 0.9rem;
          border-radius: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          font-weight: 900;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .btn:active {
          transform: translateY(2px);
          box-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }
        .btn-dark {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .tok {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

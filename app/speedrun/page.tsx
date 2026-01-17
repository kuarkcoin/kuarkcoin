'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactConfetti from 'react-confetti';

// 3000+ kelimelik dosyan
import fullWordList from '@/data/yds_vocabulary.json';

type WordItem = { word: string; meaning: string };
type GameState = 'menu' | 'playing' | 'gameover';
type Difficulty = 'easy' | 'medium' | 'hard';

// -------------------- HELPERS --------------------
function norm(s: string) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// -------------------- WINDOW SIZE (Confetti) --------------------
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// -------------------- STORAGE --------------------
const HS_KEY = 'englishmeter_speedrun_highscore_v2';

// -------------------- PAGE --------------------
export default function SpeedRunPage() {
  const { width, height } = useWindowSize();

  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const [timeLeft, setTimeLeft] = useState(120);

  const [currentWord, setCurrentWord] = useState<WordItem>({ word: '', meaning: '' });
  const [options, setOptions] = useState<string[]>([]);

  // Son N kelime tekrar etmesin
  const [lastWords, setLastWords] = useState<string[]>([]);

  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<number | null>(null);

  // 3 ses preload (mobilde lag azaltır)
  const soundsRef = useRef<Record<'correct' | 'wrong' | 'finish', HTMLAudioElement | null>>({
    correct: null,
    wrong: null,
    finish: null,
  });

  const playSound = useCallback((type: 'correct' | 'wrong' | 'finish') => {
    try {
      if (typeof window === 'undefined') return;

      const a = soundsRef.current[type];
      if (a) {
        a.currentTime = 0;
        a.volume = 0.5;
        a.play().catch(() => {});
        return;
      }

      // fallback (ilk yüklenmede)
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // sessiz geç
    }
  }, []);

  // --- LOAD HIGHSCORE + PRELOAD SOUNDS ---
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(HS_KEY);
        if (saved) {
          const n = parseInt(saved, 10);
          if (Number.isFinite(n)) setHighScore(n);
        }

        // preload
        const correct = new Audio('/sounds/correct.mp3');
        const wrong = new Audio('/sounds/wrong.mp3');
        const finish = new Audio('/sounds/finish.mp3');

        // iOS/Safari bazen play() gerektirir ama preload için set etmek yeterli
        correct.preload = 'auto';
        wrong.preload = 'auto';
        finish.preload = 'auto';

        soundsRef.current = { correct, wrong, finish };
      }
    } catch {
      // ignore
    }

    return () => {
      if (confettiTimerRef.current) window.clearTimeout(confettiTimerRef.current);
    };
  }, []);

  // -------------------- POOL --------------------
  const baseList: WordItem[] = useMemo(() => {
    const list = (fullWordList as any[])
      .map((x) => ({
        word: String(x?.word || '').trim(),
        meaning: String(x?.meaning || '').trim(),
      }))
      .filter((x) => x.word && x.meaning);

    // word normalize ile tekrarları azalt
    // aynı word farklı yazılmışsa ilkini al
    const seen = new Set<string>();
    const dedup: WordItem[] = [];
    for (const it of list) {
      const key = norm(it.word);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(it);
    }
    return dedup;
  }, []);

  const pool: WordItem[] = useMemo(() => {
    const byLen = (min: number, max: number) =>
      baseList.filter((x) => {
        const L = x.word.replace(/[^a-zA-Z]/g, '').length;
        return L >= min && L <= max;
      });

    if (difficulty === 'easy') return byLen(4, 5);
    if (difficulty === 'hard') return byLen(8, 30);
    return byLen(6, 7); // medium
  }, [difficulty, baseList]);

  // Meaning havuzu (distractor için unique)
  const meaningPoolByDifficulty: string[] = useMemo(() => {
    const src = (pool.length >= 20 ? pool : baseList);
    return Array.from(new Set(src.map((x) => x.meaning).filter(Boolean))).filter((m) => m.length >= 1);
  }, [pool, baseList]);

  // -------------------- TIMER (interval) --------------------
  const intervalRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const endGame = useCallback(
    (finalScore: number) => {
      stopTimer();
      setGameState('gameover');
      playSound('finish');

      setHighScore((prev) => {
        const next = Math.max(prev, finalScore);
        try {
          if (typeof window !== 'undefined') localStorage.setItem(HS_KEY, String(next));
        } catch {}
        return next;
      });

      // Confetti only if new high score
      setShowConfetti((prevShow) => {
        // hesap: localStorage/prev state ile yarış olmasın diye finalScore üzerinden kontrol
        const currentHS = (() => {
          try {
            if (typeof window === 'undefined') return 0;
            const raw = localStorage.getItem(HS_KEY);
            const n = parseInt(raw || '0', 10);
            return Number.isFinite(n) ? n : 0;
          } catch {
            return 0;
          }
        })();

        const isNew = finalScore >= currentHS && finalScore > 0;
        return isNew ? true : prevShow;
      });

      // Confetti kapatma
      if (confettiTimerRef.current) window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = window.setTimeout(() => setShowConfetti(false), 8000);
    },
    [playSound, stopTimer]
  );

  const startTimer = useCallback(() => {
    stopTimer();
    if (typeof window === 'undefined') return;

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // time bitti
          // finalScore'yu garanti almak için score ref kullanacağız
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // score ref: time bitince doğru finalScore
  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // timeLeft 0 olunca endGame tetik
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      endGame(scoreRef.current);
    }
  }, [gameState, timeLeft, endGame]);

  // -------------------- QUESTION ENGINE --------------------
  const makeQuestionFromPool = useCallback(
    (source: WordItem[]) => {
      if (!source || source.length === 0) return;

      // normalize lastWords hızlı set
      const lastSet = new Set(lastWords.map(norm));

      // 1) Rastgele kelime seç ama son 20'de varsa yeniden seç
      let picked: WordItem | null = null;
      const maxTry = 80;

      for (let t = 0; t < maxTry; t++) {
        const idx = Math.floor(Math.random() * source.length);
        const candidate = source[idx];
        if (!candidate?.word || !candidate?.meaning) continue;
        if (lastSet.has(norm(candidate.word))) continue;
        picked = candidate;
        break;
      }

      // sıkışırsa yine de seç
      if (!picked) {
        picked = source[Math.floor(Math.random() * source.length)] || null;
      }
      if (!picked) return;

      // 2) Yanlış şıklar: unique meaning, doğru ile aynı değil
      const correctMeaning = picked.meaning;
      const distractSet = new Set<string>();

      let guard = 0;
      while (distractSet.size < 3 && guard < 800) {
        guard++;

        // meaning havuzundan çek
        const m = meaningPoolByDifficulty[Math.floor(Math.random() * meaningPoolByDifficulty.length)];
        if (!m) continue;
        if (m === correctMeaning) continue;
        distractSet.add(m);
      }

      // Eğer hala 3 yoksa source içinden tamamla
      guard = 0;
      while (distractSet.size < 3 && guard < 1200) {
        guard++;
        const w = source[Math.floor(Math.random() * source.length)];
        if (!w?.meaning) continue;
        if (w.meaning === correctMeaning) continue;
        distractSet.add(w.meaning);
      }

      // En kötü ihtimal: options'u yine de 4'e tamamla (aynı meaning tekrar etmesin diye)
      if (distractSet.size < 3) {
        // anlam havuzu yetersizse: (çok nadir) random boş/benzerleri kabul etmeden yine de doldur
        const allMeanings = Array.from(new Set([...meaningPoolByDifficulty, ...source.map((x) => x.meaning)].filter(Boolean)));
        for (const m of allMeanings) {
          if (distractSet.size >= 3) break;
          if (m === correctMeaning) continue;
          distractSet.add(m);
        }
      }

      const distractors = Array.from(distractSet).slice(0, 3);
      const allOptions = shuffle([...distractors, correctMeaning]);

      setCurrentWord(picked);
      setOptions(allOptions);

      // lastWords güncelle (son 20 tut)
      setLastWords((prev) => {
        const next = [...prev, picked!.word];
        return next.slice(-20);
      });
    },
    [lastWords, meaningPoolByDifficulty]
  );

  const generateQuestion = useCallback(() => {
    const src = pool && pool.length >= 10 ? pool : baseList;
    makeQuestionFromPool(src);
  }, [pool, baseList, makeQuestionFromPool]);

  // -------------------- GAME ACTIONS --------------------
  const startGame = useCallback(() => {
    setShowConfetti(false);
    setLastWords([]);

    setScore(0);
    setCombo(0);
    setTimeLeft(120);
    setGameState('playing');

    // soru + timer
    generateQuestion();
    startTimer();
  }, [generateQuestion, startTimer]);

  const goMenu = useCallback(() => {
    stopTimer();
    setGameState('menu');
  }, [stopTimer]);

  const handleAnswer = useCallback(
    (selectedMeaning: string) => {
      if (gameState !== 'playing') return;
      if (!currentWord.word || !currentWord.meaning) return;

      const isCorrect = selectedMeaning === currentWord.meaning;

      if (isCorrect) {
        playSound('correct');

        // score + time bonus
        setScore((prev) => prev + 10);
        setTimeLeft((prev) => prev + 4);

        // combo + bonus
        setCombo((c) => {
          const next = c + 1;
          if (next % 5 === 0) {
            setScore((s) => s + 20);
            // istersen ek zaman bonusu:
            // setTimeLeft((t) => t + 1);
          }
          return next;
        });

        generateQuestion();
      } else {
        playSound('wrong');
        setCombo(0);
        setTimeLeft((prev) => Math.max(0, prev - 2));
        generateQuestion();
      }
    },
    [currentWord.meaning, currentWord.word, gameState, generateQuestion, playSound]
  );

  // Menüye dönünce timer dursun (garanti)
  useEffect(() => {
    if (gameState !== 'playing') stopTimer();
  }, [gameState, stopTimer]);

  const isLowTime = timeLeft < 10;

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-yellow-400 selection:text-indigo-900 overflow-hidden relative">
      {/* CONFETTI */}
      {showConfetti && (
        <div className="absolute top-0 left-0 w-full h-full z-50 pointer-events-none">
          <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={500} />
        </div>
      )}

      {/* MENU */}
      {gameState === 'menu' && (
        <div className="text-center max-w-md w-full bg-indigo-900/80 p-10 rounded-3xl shadow-2xl border border-indigo-800 backdrop-blur-sm relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-full mb-6 shadow-lg shadow-yellow-400/20 text-4xl animate-bounce">
            ⚡
          </div>

          <h1 className="text-6xl font-black mb-2 text-white tracking-tighter">
            Speed<span className="text-yellow-400">Run</span>
          </h1>
          <p className="text-indigo-300 mb-6 font-medium">
            Vocabulary Challenge • 120s
            <br />
            Choose difficulty and go!
          </p>

          {/* Difficulty */}
          <div className="bg-indigo-950/60 p-5 rounded-2xl mb-6 border border-indigo-800/50 text-left">
            <p className="text-xs text-indigo-400 uppercase font-bold tracking-widest mb-3">DIFFICULTY</p>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
                const active = d === difficulty;
                const label = d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard';
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-xl font-black border transition-all ${
                      active
                        ? 'bg-yellow-400 text-indigo-950 border-yellow-300'
                        : 'bg-indigo-900/40 text-indigo-200 border-indigo-700 hover:bg-indigo-800/60'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-indigo-300/80">Easy: 4–5 letters • Medium: 6–7 • Hard: 8+</p>
          </div>

          {/* Highscore */}
          <div className="bg-indigo-950/60 p-6 rounded-2xl mb-8 border border-indigo-800/50">
            <p className="text-xs text-indigo-400 uppercase font-bold tracking-widest mb-1">BEST SCORE</p>
            <p className="text-4xl font-mono text-yellow-400 font-bold">{highScore}</p>
          </div>

          <button
            onClick={startGame}
            className="w-full py-5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-indigo-950 font-black rounded-2xl text-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-orange-500/20"
          >
            START GAME
          </button>

          <Link href="/" className="block mt-8 text-indigo-400 hover:text-white text-sm font-semibold transition-colors">
            ← Return to Main Menu
          </Link>
        </div>
      )}

      {/* PLAYING */}
      {gameState === 'playing' && (
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 relative z-10">
          {/* Üst Panel */}
          <div className="flex justify-between items-center mb-6 bg-indigo-900/60 p-4 rounded-2xl backdrop-blur-md border border-indigo-800/50">
            <div>
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">TIME</div>
              <div
                className={`text-4xl font-black font-mono leading-none ${
                  isLowTime ? 'text-red-500 animate-pulse' : 'text-white'
                }`}
              >
                {timeLeft}
                <span className="text-lg text-indigo-400 ml-1">s</span>
              </div>
              <div className="mt-2 text-[11px] text-indigo-300/80 font-bold">
                Difficulty: <span className="text-yellow-300 uppercase">{difficulty}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">SCORE</div>
              <div className="text-4xl font-black text-yellow-400 font-mono leading-none">{score}</div>

              <div className="mt-2 text-[11px] font-bold">
                Combo: <span className="text-emerald-300">🔥 {combo}</span>
                {combo > 0 && combo % 5 === 0 && <span className="ml-2 text-yellow-300">+20!</span>}
              </div>
            </div>
          </div>

          {/* Soru Kartı */}
          <div className="bg-white text-indigo-950 p-12 rounded-[2rem] shadow-2xl mb-6 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
            <p className="text-indigo-400 text-xs font-bold uppercase mb-3 tracking-widest">TRANSLATE</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight break-words group-hover:scale-105 transition-transform duration-300">
              {currentWord.word || '...'}
            </h2>
          </div>

          {/* Şıklar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt, idx) => (
              <button
                key={`${opt}-${idx}`}
                onClick={() => handleAnswer(opt)}
                className="py-5 px-4 bg-indigo-800/80 hover:bg-indigo-600 border-b-4 border-indigo-950 hover:border-indigo-800 rounded-2xl text-lg font-bold text-indigo-100 transition-all active:translate-y-1 active:border-b-0 backdrop-blur-sm"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === 'gameover' && (
        <div className="text-center max-w-md w-full bg-indigo-900/90 p-10 rounded-3xl shadow-2xl border border-indigo-800 backdrop-blur-md animate-in slide-in-from-bottom-10 duration-500 relative z-20">
          <h2 className="text-5xl font-black text-white mb-2 tracking-tight">Time&apos;s Up!</h2>

          {showConfetti ? (
            <p className="text-yellow-400 font-bold mb-8 animate-pulse text-lg">🎉 NEW HIGH SCORE! 🎉</p>
          ) : (
            <p className="text-indigo-300 mb-8">Great effort! Keep practicing.</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="py-6 bg-indigo-950/80 rounded-2xl border border-indigo-800">
              <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mb-1">SCORE</p>
              <p className="text-4xl font-black text-white">{score}</p>
            </div>
            <div className="py-6 bg-indigo-950/80 rounded-2xl border border-indigo-800">
              <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mb-1">BEST</p>
              <p className={`text-4xl font-black ${score >= highScore ? 'text-green-400' : 'text-yellow-400'}`}>
                {highScore}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={startGame}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black rounded-xl text-lg transition-transform active:scale-95 shadow-lg"
            >
              PLAY AGAIN ↻
            </button>

            <button
              onClick={goMenu}
              className="w-full py-4 bg-indigo-800 hover:bg-indigo-700 rounded-xl font-bold text-indigo-200 transition-colors"
            >
              Back to Difficulty
            </button>

            <Link
              href="/"
              className="w-full py-4 bg-indigo-950/60 hover:bg-indigo-950/80 rounded-xl font-bold text-indigo-200 transition-colors border border-indigo-800"
            >
              Exit to Main Menu
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
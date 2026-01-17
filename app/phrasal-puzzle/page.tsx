"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import phrasalsRaw from "@/data/yds_phrasal_verbs.json";

type PhrasalItem = { word: string; meaning: string };
type ToastKind = "ok" | "bad" | "info";

// -------------------- SIMPLE SOUND (A: NO FILES) --------------------
let __td_audio_ctx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AnyWin = window as any;
  const Ctx = window.AudioContext || AnyWin.webkitAudioContext;
  if (!Ctx) return null;

  if (!__td_audio_ctx) __td_audio_ctx = new Ctx();
  return __td_audio_ctx;
}

// Tiny beep generator (safe for mobile: needs user gesture; your buttons provide it)
function playBeep(freq = 440, duration = 0.08, type: OscillatorType = "sine", volume = 0.06) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  // Some browsers suspend audio until first interaction; try resume silently
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  // clickless envelope
  const now = ctx.currentTime;
  const attack = 0.008;
  const release = Math.max(0.01, duration - attack);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);

  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {}
  };
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanWord(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// "put up with" => verb="PUT", particle="UP WITH"
function splitPhrasal(word: string) {
  const w = cleanWord(word);
  const parts = w.split(" ").filter(Boolean);
  const verb = (parts[0] || "").toUpperCase();
  const particle = parts.slice(1).join(" ").toUpperCase();
  return { verb, particle };
}

// Normalize for comparisons
function norm(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function pickDistinct<T>(pool: T[], count: number, except?: (x: T) => boolean) {
  const out: T[] = [];
  const maxTry = 5000;
  let tries = 0;

  while (out.length < count && tries < maxTry) {
    tries++;
    const x = pool[Math.floor(Math.random() * pool.length)];
    if (except?.(x)) continue;
    if (out.includes(x)) continue;
    out.push(x);
  }
  return out;
}

const RECENT_KEY = "td_phrasal_puzzle_recent_v2";
const BEST_KEY = "td_phrasal_puzzle_best_v2";

function loadRecent(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String);
  } catch {
    return [];
  }
}

function saveRecent(recent: string[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {}
}

function loadBest(): number {
  try {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(BEST_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(BEST_KEY, String(n));
  } catch {}
}

export default function PhrasalParticlePuzzlePage() {
  // ---- DATA POOL ----
  const pool = useMemo(() => {
    const arr = (phrasalsRaw as any[])
      .map((x) => ({
        word: cleanWord(x?.word),
        meaning: String(x?.meaning || "").trim(),
      }))
      .filter((x) => x.word && x.meaning)
      .filter((x) => x.word.includes(" ")) // at least 2-word phrasal
      .filter((x) => /^[a-z\s]+$/.test(x.word)) // letters+spaces only
      .filter((x) => x.meaning.length >= 4); // minimal meaning length
    return arr as PhrasalItem[];
  }, []);

  // ---- UNIQUE OPTION POOLS (fix: dedupe duplicates) ----
  const verbsAll = useMemo(() => {
    return Array.from(new Set(pool.map((x) => splitPhrasal(x.word).verb).filter(Boolean)));
  }, [pool]);

  const particlesAll = useMemo(() => {
    return Array.from(new Set(pool.map((x) => splitPhrasal(x.word).particle).filter(Boolean)));
  }, [pool]);

  // ---- GAME STATE ----
  const [loading, setLoading] = useState(true);

  const [target, setTarget] = useState<PhrasalItem | null>(null);
  const [targetVerb, setTargetVerb] = useState("");
  const [targetParticle, setTargetParticle] = useState("");

  const [verbOptions, setVerbOptions] = useState<string[]>([]);
  const [particleOptions, setParticleOptions] = useState<string[]>([]);

  const [pickVerb, setPickVerb] = useState<string>("");
  const [pickParticle, setPickParticle] = useState<string>("");

  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string, kind: ToastKind = "info") => {
    setToast({ msg, kind });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 1400);
  }, []);

  useEffect(() => {
    setBest(loadBest());
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      // cleanup audio context (optional)
      try {
        __td_audio_ctx?.close();
      } catch {}
      __td_audio_ctx = null;
    };
  }, []);

  // ---- ROUND GENERATOR ----
  const newRound = useCallback(() => {
    // Hard guard
    if (pool.length < 10 || verbsAll.length < 6 || particlesAll.length < 6) {
      setLoading(false);
      setTarget(null);
      showToast("Phrasal listesi yetersiz (en az 6 verb ve 6 particle lazım).", "bad");
      // subtle error beep
      playBeep(220, 0.12, "sawtooth", 0.05);
      return;
    }

    setLoading(true);
    setStatus("playing");
    setPickVerb("");
    setPickParticle("");

    const recent = loadRecent();
    const recentSet = new Set(recent);

    let chosen: PhrasalItem | null = null;
    const maxTry = 4000;
    let tries = 0;

    while (!chosen && tries < maxTry) {
      tries++;
      const cand = pool[Math.floor(Math.random() * pool.length)];
      if (recentSet.has(cand.word)) continue;

      const { verb, particle } = splitPhrasal(cand.word);
      if (!verb || !particle) continue;

      chosen = { word: cand.word, meaning: cand.meaning };
    }

    // Fallback: if everything is "recent", reset recent list
    if (!chosen) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      chosen = { word: cand.word, meaning: cand.meaning };
      saveRecent([]);
    }

    const { verb: vCorrect, particle: pCorrect } = splitPhrasal(chosen.word);

    setTarget(chosen);
    setTargetVerb(vCorrect);
    setTargetParticle(pCorrect);

    // Pick wrong options from UNIQUE pools
    const wrongVerbs = pickDistinct(verbsAll, 5, (v) => v === vCorrect);
    const wrongParticles = pickDistinct(particlesAll, 5, (p) => p === pCorrect);

    // Ensure we always show 6 options even if pickDistinct returns fewer (rare)
    const vSet = new Set([...wrongVerbs, vCorrect]);
    while (vSet.size < 6) {
      const v = verbsAll[Math.floor(Math.random() * verbsAll.length)];
      if (v !== vCorrect) vSet.add(v);
    }

    const pSet = new Set([...wrongParticles, pCorrect]);
    while (pSet.size < 6) {
      const p = particlesAll[Math.floor(Math.random() * particlesAll.length)];
      if (p !== pCorrect) pSet.add(p);
    }

    setVerbOptions(shuffle(Array.from(vSet)));
    setParticleOptions(shuffle(Array.from(pSet)));

    const nextRecent = [chosen.word, ...recent].slice(0, 30);
    saveRecent(nextRecent);

    setLoading(false);
    // new round tiny "start" tick
    playBeep(520, 0.05, "sine", 0.04);
  }, [pool, verbsAll, particlesAll, showToast]);

  useEffect(() => {
    newRound();
  }, [newRound]);

  const combined = useMemo(() => {
    if (!pickVerb || !pickParticle) return "";
    return norm(`${pickVerb} ${pickParticle}`);
  }, [pickVerb, pickParticle]);

  const checkAnswer = useCallback(() => {
    if (!target) return;

    if (!pickVerb || !pickParticle) {
      showToast("Önce Verb + Particle seç.", "info");
      playBeep(300, 0.08, "square", 0.04);
      return;
    }

    const correct = norm(`${targetVerb} ${targetParticle}`);

    if (combined === correct) {
      setStatus("won");

      // correct fanfare (2 quick beeps)
      playBeep(880, 0.07, "triangle", 0.06);
      setTimeout(() => playBeep(1175, 0.08, "triangle", 0.06), 80);

      // Score + best (safe, single source of truth)
      setScore((prev) => {
        const nextScore = prev + 10;
        setBest((bPrev) => {
          const nextBest = Math.max(bPrev, nextScore);
          if (nextBest !== bPrev) saveBest(nextBest);
          return nextBest;
        });
        return nextScore;
      });

      setStreak((s) => s + 1);
      showToast("✅ Correct!", "ok");
    } else {
      setStatus("lost");
      setStreak(0);

      // wrong buzz
      playBeep(220, 0.12, "sawtooth", 0.06);

      showToast("❌ Wrong!", "bad");
    }
  }, [combined, pickParticle, pickVerb, showToast, target, targetParticle, targetVerb]);

  const next = useCallback(() => newRound(), [newRound]);

  const resetPick = useCallback(() => {
    setPickVerb("");
    setPickParticle("");
    playBeep(420, 0.05, "sine", 0.04);
  }, []);

  const pill =
    toast?.kind === "ok"
      ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
      : toast?.kind === "bad"
      ? "bg-rose-500/15 border-rose-400/30 text-rose-200"
      : "bg-white/10 border-white/10 text-slate-200";

  const glow =
    status === "won"
      ? "ring-2 ring-emerald-500/40"
      : status === "lost"
      ? "ring-2 ring-rose-500/40"
      : "ring-1 ring-white/10";

  // For highlighting correct/wrong after round ends (UX upgrade)
  const correctVerb = target ? targetVerb : "";
  const correctParticle = target ? targetParticle : "";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-slate-300 hover:text-white font-bold">
            ← Home
          </Link>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Score
              </div>
              <div className="text-lg font-black text-amber-300">{score}</div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Streak
              </div>
              <div className="text-lg font-black text-emerald-300">🔥 {streak}</div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Best
              </div>
              <div className="text-lg font-black text-indigo-300">{best}</div>
            </div>
          </div>
        </div>

        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-200 text-sm font-bold">
            🧩 Particle Puzzle
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Phrasal Verbs — Build the Word
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Pick a <span className="text-sky-300 font-bold">VERB</span> + a{" "}
            <span className="text-amber-300 font-bold">PARTICLE</span> to match the meaning.
          </p>
        </header>

        {/* TOAST */}
        {toast && (
          <div className="text-center">
            <div className={`inline-flex px-4 py-2 rounded-xl border text-sm font-black ${pill}`}>
              {toast.msg}
            </div>
          </div>
        )}

        {/* MAIN CARD */}
        <section className={`rounded-3xl bg-white/5 border border-white/10 p-5 md:p-8 ${glow}`}>
          {loading ? (
            <div className="text-center text-slate-400 font-bold py-12">Loading...</div>
          ) : !target ? (
            <div className="text-center text-slate-300 font-bold py-12">
              Data not ready. Check{" "}
              <code className="px-1 py-0.5 rounded bg-white/5 border border-white/10">
                yds_phrasal_verbs.json
              </code>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* LEFT */}
              <div className="space-y-5">
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                    Meaning
                  </div>
                  <div className="text-lg md:text-xl font-bold leading-relaxed text-white">
                    {target.meaning}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-5">
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-3">
                    Your Build
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-center">
                    <span className="px-4 py-2 rounded-2xl bg-sky-500/15 border border-sky-400/25 text-sky-200 font-black tracking-widest">
                      {pickVerb || "____"}
                    </span>
                    <span className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/25 text-amber-200 font-black tracking-widest">
                      {pickParticle || "____"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        // click tick
                        playBeep(520, 0.04, "sine", 0.04);
                        checkAnswer();
                      }}
                      disabled={status !== "playing"}
                      className={`flex-1 py-3 rounded-2xl font-black transition-all ${
                        status !== "playing"
                          ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                    >
                      CHECK
                    </button>
                    <button
                      onClick={resetPick}
                      disabled={loading || status !== "playing"}
                      className={`sm:w-40 py-3 rounded-2xl font-black transition-all ${
                        loading || status !== "playing"
                          ? "bg-slate-900 text-slate-500 cursor-not-allowed"
                          : "bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      RESET
                    </button>
                  </div>

                  {status !== "playing" && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                      <div className="text-slate-300 text-sm">Answer:</div>
                      <div className="text-2xl font-black tracking-widest mt-1">
                        {`${targetVerb} ${targetParticle}`}
                      </div>
                      <button
                        onClick={() => {
                          playBeep(600, 0.05, "sine", 0.04);
                          next();
                        }}
                        className="mt-3 px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black"
                      >
                        NEXT
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl bg-sky-500/10 border border-sky-400/15 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-black text-sky-200">VERB</div>
                    <div className="text-[11px] text-sky-200/70 font-bold uppercase tracking-widest">
                      Choose 1
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {verbOptions.map((v) => {
                      const active = pickVerb === v;

                      const isCorrect = status !== "playing" && v === correctVerb;
                      const isWrongPick = status === "lost" && active && v !== correctVerb;

                      const base =
                        "py-3 rounded-2xl border font-black tracking-widest transition-all";

                      const cls =
                        status === "playing"
                          ? active
                            ? "bg-sky-500/30 border-sky-300 text-white"
                            : "bg-slate-950/40 border-sky-400/15 text-sky-100 hover:bg-sky-500/15"
                          : isCorrect
                          ? "bg-emerald-500/20 border-emerald-300/40 text-emerald-100"
                          : isWrongPick
                          ? "bg-rose-500/20 border-rose-300/40 text-rose-100"
                          : "bg-slate-950/30 border-white/10 text-slate-300";

                      return (
                        <button
                          key={v}
                          onClick={() => {
                            if (status !== "playing") return;
                            playBeep(520, 0.04, "sine", 0.04);
                            setPickVerb(v);
                          }}
                          className={`${base} ${cls}`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-500/10 border border-amber-400/15 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-black text-amber-200">PARTICLE</div>
                    <div className="text-[11px] text-amber-200/70 font-bold uppercase tracking-widest">
                      Choose 1
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {particleOptions.map((p) => {
                      const active = pickParticle === p;

                      const isCorrect = status !== "playing" && p === correctParticle;
                      const isWrongPick = status === "lost" && active && p !== correctParticle;

                      const base =
                        "py-3 rounded-2xl border font-black tracking-widest transition-all";

                      const cls =
                        status === "playing"
                          ? active
                            ? "bg-amber-500/30 border-amber-300 text-white"
                            : "bg-slate-950/40 border-amber-400/15 text-amber-100 hover:bg-amber-500/15"
                          : isCorrect
                          ? "bg-emerald-500/20 border-emerald-300/40 text-emerald-100"
                          : isWrongPick
                          ? "bg-rose-500/20 border-rose-300/40 text-rose-100"
                          : "bg-slate-950/30 border-white/10 text-slate-300";

                      return (
                        <button
                          key={p}
                          onClick={() => {
                            if (status !== "playing") return;
                            playBeep(520, 0.04, "sine", 0.04);
                            setPickParticle(p);
                          }}
                          className={`${base} ${cls}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-3">
                    Quick Controls
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        playBeep(600, 0.05, "sine", 0.04);
                        newRound();
                      }}
                      className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-black"
                    >
                      NEW WORD
                    </button>
                    <button
                      onClick={() => {
                        saveRecent([]);
                        showToast("Recent list cleared.", "ok");
                        playBeep(900, 0.06, "triangle", 0.05);
                      }}
                      className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-black"
                    >
                      CLEAR RECENT
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Not repeating: keeps last <b>30</b> words in localStorage.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500 text-center">
          Tip: Multi-part particles are supported (e.g. <b>UP WITH</b>). Data source:{" "}
          <code className="px-1 py-0.5 rounded bg-white/5 border border-white/10">
            yds_phrasal_verbs.json
          </code>
        </p>
      </div>
    </main>
  );
}
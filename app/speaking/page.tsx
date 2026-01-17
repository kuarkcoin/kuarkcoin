// app/speaking/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
type ScenarioId = 'coffee' | 'taxi' | 'hotel' | 'restaurant' | 'shopping';

type Scenario = {
  id: ScenarioId;
  title: string;
  subtitle: string;
  emoji: string;
  starters: string[];
  hints: string[];
};

type SpeakingResponse = {
  understood: boolean;
  meaning_score: number; // 0-100
  fluency_score: number; // 0-100
  grammar_fixes: string[];
  natural_reply: string;
  next_npc_line: string;
  notes: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'coffee',
    title: 'Coffee Shop',
    subtitle: 'Order a drink politely',
    emoji: '☕',
    starters: ['Hi! What would you like to drink?', 'Good afternoon! What can I get you today?', 'Welcome! What would you like?'],
    hints: ['I would like a ___, please.', 'Can I have a ___?', 'Small/medium/large, please.']
  },
  {
    id: 'taxi',
    title: 'Taxi Ride',
    subtitle: 'Give destination & small talk',
    emoji: '🚕',
    starters: ['Hi! Where would you like to go?', 'Hello! What’s your destination?', 'Good evening! Where are we heading?'],
    hints: ['To ___, please.', 'How long will it take?', 'Can you take the fastest route?']
  },
  {
    id: 'hotel',
    title: 'Hotel Check-in',
    subtitle: 'Check in & ask basics',
    emoji: '🏨',
    starters: ['Hello! Do you have a reservation?', 'Welcome. Can I have your name, please?', 'Hi! Checking in today?'],
    hints: ['Yes, it’s under ___.', 'Can I have a room with a view?', 'What time is breakfast?']
  },
  {
    id: 'restaurant',
    title: 'Restaurant Order',
    subtitle: 'Order food & ask options',
    emoji: '🍽️',
    starters: ['Hi! Are you ready to order?', 'Hello! What would you like today?', 'Good evening! Can I take your order?'],
    hints: ['I’ll have the ___.', 'Could I get it without ___?', 'Can we have the bill, please?']
  },
  {
    id: 'shopping',
    title: 'Shopping',
    subtitle: 'Ask size, price, help',
    emoji: '🛍️',
    starters: ['Hi! Can I help you find something?', 'Hello! What are you looking for?', 'Welcome! Need any help today?'],
    hints: ['Do you have this in size ___?', 'How much is it?', 'Can I try it on?']
  }
];

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function speak(text: string, lang: 'en-US' | 'en-GB', rate = 0.95) {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = 1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

function vibrate(ms: number) {
  if (typeof navigator === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n: any = navigator;
  if ('vibrate' in n) n.vibrate(ms);
}

type SpeechRecognitionType = any;

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function SpeakingPage() {
  // Core selections
  const [scenarioId, setScenarioId] = useState<ScenarioId>('coffee');
  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId)!, [scenarioId]);

  const [level, setLevel] = useState<Level>('B1');
  const [accent, setAccent] = useState<'en-US' | 'en-GB'>('en-US');

  // Conversation state
  const [npcLine, setNpcLine] = useState<string>(() => pickRandom(SCENARIOS[0].starters));
  const [transcript, setTranscript] = useState<string>('');
  const [isFlippedHint, setIsFlippedHint] = useState(false);

  // Mic / API states
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string>('');

  const [coach, setCoach] = useState<SpeakingResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  // Refs
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const listeningLock = useRef(false);

  // Reset starter whenever scenario OR accent changes
  useEffect(() => {
    const sc = SCENARIOS.find((s) => s.id === scenarioId)!;
    const starter = pickRandom(sc.starters);

    // stop mic if running (avoid dangling recognition)
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    listeningLock.current = false;

    setNpcLine(starter);
    setTranscript('');
    setCoach(null);
    setApiError('');
    setMicError('');
    setIsListening(false);
    setIsFlippedHint(false);

    vibrate(10);
    speak(starter, accent, 0.95);
  }, [scenarioId, accent]);

  const onSpeakNpc = useCallback(() => {
    speak(npcLine, accent, 0.95);
    vibrate(8);
  }, [npcLine, accent]);

  const onSpeakModel = useCallback(() => {
    if (!coach?.natural_reply) return;
    speak(coach.natural_reply, accent, 0.95);
    vibrate(8);
  }, [coach, accent]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setIsListening(false);
    listeningLock.current = false;
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return;
    if (listeningLock.current) return;

    setApiError('');
    setMicError('');
    setTranscript('');
    setCoach(null);

    const SR = getSpeechRecognition();
    if (!SR) {
      setMicError('SpeechRecognition not supported. Try Chrome/Edge on Android/PC.');
      return;
    }

    listeningLock.current = true;
    setIsListening(true);
    vibrate(12);

    const rec: SpeechRecognitionType = new SR();
    recognitionRef.current = rec;

    rec.lang = accent;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = '';

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res?.[0]?.transcript ?? '';
        if (res.isFinal) finalText += (finalText ? ' ' : '') + t;
        else interim += t;
      }
      setTranscript((finalText + ' ' + interim).trim());
    };

    rec.onerror = (e: any) => {
      const msg = e?.error ? String(e.error) : 'microphone error';
      setMicError(`Mic error: ${msg}`);
      stopListening();
    };

    rec.onend = () => {
      setIsListening(false);
      listeningLock.current = false;
    };

    try {
      rec.start();
    } catch {
      setMicError('Could not start microphone. Please allow mic permission and try again.');
      stopListening();
    }
  }, [accent, isListening, stopListening]);

  const evaluateWithGemini = useCallback(async () => {
    const said = transcript.trim();
    if (!said) {
      setApiError('Please speak first (or try again).');
      return;
    }

    setIsLoadingAI(true);
    setApiError('');

    try {
      const res = await fetch('/api/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenario.title,
          npc_line: npcLine,
          user_said: said,
          level
        })
      });

      const data = (await res.json()) as SpeakingResponse | { error?: string };

      if (!res.ok) {
        setApiError((data as any)?.error || 'Server error');
        return;
      }

      const parsed = data as SpeakingResponse;
      setCoach(parsed);

      if (parsed?.next_npc_line) {
        setNpcLine(parsed.next_npc_line);
      }

      vibrate(10);
    } catch (e: any) {
      setApiError(e?.message ?? 'Network error');
    } finally {
      setIsLoadingAI(false);
    }
  }, [transcript, scenario.title, npcLine, level]);

  const nextRound = useCallback(() => {
    setTranscript('');
    setCoach(null);
    setApiError('');
    setMicError('');
    setIsFlippedHint(false);
    vibrate(8);
    speak(npcLine, accent, 0.95);
  }, [npcLine, accent]);

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (t as any)?.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isListening) stopListening();
        else startListening();
      }
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        evaluateWithGemini();
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        nextRound();
      }
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onSpeakNpc();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [evaluateWithGemini, isListening, nextRound, onSpeakNpc, startListening, stopListening]);

  const scoreColor = (v: number) => {
    if (v >= 85) return 'text-emerald-600';
    if (v >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="w-full max-w-3xl mx-auto px-4 pt-4 flex items-center justify-between">
        <Link href="/" className="text-slate-500 hover:text-slate-900 font-black flex items-center gap-2">
          <span className="inline-flex w-9 h-9 rounded-2xl bg-white border border-slate-200 items-center justify-center">←</span>
          Home
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAccent(accent === 'en-US' ? 'en-GB' : 'en-US')}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-extrabold active:scale-95"
            title="Switch accent"
          >
            {accent === 'en-US' ? '🇺🇸 US' : '🇬🇧 UK'}
          </button>

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-extrabold"
            aria-label="Level"
          >
            {(['A1', 'A2', 'B1', 'B2', 'C1'] as Level[]).map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="w-full max-w-3xl mx-auto px-4 mt-4">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-[11px] font-black uppercase tracking-wider">
                🎙️ Speaking Mode
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-black text-slate-900">Speak in Real Life</h1>
              <p className="mt-1 text-slate-500 text-sm md:text-base">
                Short daily conversation rounds. Speak → get feedback → continue.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                Space = Mic
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                E = Evaluate
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                P = Play NPC
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                R = Next Prompt
              </div>
            </div>
          </div>

          {/* Scenario picker */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            {SCENARIOS.map((s) => {
              const active = s.id === scenarioId;
              return (
                <button
                  key={s.id}
                  onClick={() => setScenarioId(s.id)}
                  className={`text-left rounded-2xl p-3 border font-extrabold transition-all active:scale-[0.99]
                    ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="text-lg">{s.emoji}</div>
                  <div className="mt-1 text-xs">{s.title}</div>
                  <div className={`mt-1 text-[10px] font-bold ${active ? 'text-white/70' : 'text-slate-400'}`}>
                    {s.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="w-full max-w-3xl mx-auto px-4 mt-4 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NPC card */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 text-[11px] font-black uppercase tracking-wider">
                🧑‍💼 NPC
              </div>

              <button
                onClick={onSpeakNpc}
                className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 active:scale-95"
                title="Play NPC (P)"
              >
                🔊 Play
              </button>
            </div>

            <div className="mt-4 text-slate-900 font-black text-xl leading-snug">“{npcLine}”</div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setIsFlippedHint((v) => !v)}
                className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-extrabold hover:bg-slate-100 active:scale-95"
              >
                {isFlippedHint ? 'Hide hints' : 'Show hints'}
              </button>

              <div className="text-xs text-slate-400 font-semibold">
                Accent: <span className="text-slate-600">{accent}</span> · Level:{' '}
                <span className="text-slate-600">{level}</span>
              </div>
            </div>

            {isFlippedHint && (
              <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider mb-2">Useful phrases</div>
                <ul className="space-y-1 text-sm text-slate-700 font-semibold">
                  {scenario.hints.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Your speech */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-[11px] font-black uppercase tracking-wider">
                🎤 You
              </div>

              {!isListening ? (
                <button
                  onClick={startListening}
                  className="px-4 py-2 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 active:scale-95"
                  title="Start/Stop mic (Space)"
                >
                  🎙️ Start Mic
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-95"
                  title="Start/Stop mic (Space)"
                >
                  ⏹ Stop
                </button>
              )}
            </div>

            <div className="mt-4">
              <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider mb-2">Transcript</div>

              <div
                className={`min-h-[110px] rounded-2xl border p-4 font-semibold leading-relaxed ${
                  transcript ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {transcript || 'Press Start Mic and speak your answer...'}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setTranscript('');
                    setCoach(null);
                    setApiError('');
                    setMicError('');
                    vibrate(8);
                  }}
                  className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-extrabold hover:bg-slate-50 active:scale-95"
                >
                  Clear
                </button>

                <button
                  onClick={evaluateWithGemini}
                  disabled={isLoadingAI || !transcript.trim()}
                  className="px-5 py-2 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  title="Evaluate (E)"
                >
                  {isLoadingAI ? 'Evaluating…' : '✅ Evaluate'}
                </button>
              </div>

              {micError && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm font-semibold">
                  {micError}
                </div>
              )}
              {apiError && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm font-semibold">
                  {apiError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coach feedback */}
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-black uppercase tracking-wider">
              🧠 Coach Feedback
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onSpeakModel}
                disabled={!coach?.natural_reply}
                className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                🔊 Play Model
              </button>
              <button
                onClick={nextRound}
                className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-extrabold hover:bg-slate-100 active:scale-95"
                title="Repeat NPC (R)"
              >
                ↻ Next Prompt
              </button>
            </div>
          </div>

          {!coach ? (
            <div className="mt-4 text-slate-500 font-semibold">
              Speak and press <b>Evaluate</b> to get instant feedback.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Scores</div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-slate-700 font-extrabold">Meaning</div>
                  <div className={`text-2xl font-black ${scoreColor(coach.meaning_score)}`}>{coach.meaning_score}</div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-slate-700 font-extrabold">Fluency</div>
                  <div className={`text-2xl font-black ${scoreColor(coach.fluency_score)}`}>{coach.fluency_score}</div>
                </div>

                <div className="mt-3 text-xs text-slate-500 font-semibold">
                  {coach.understood ? '✅ Understood' : '⚠️ Not understood'}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Fixes</div>
                <ul className="mt-3 space-y-2">
                  {(coach.grammar_fixes?.length ? coach.grammar_fixes : ['Looks good!']).map((f, i) => (
                    <li key={i} className="text-sm text-slate-800 font-semibold flex gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Natural Reply</div>
                <div className="mt-3 text-slate-900 font-black text-lg leading-snug">{coach.natural_reply}</div>
                <div className="mt-3 text-xs text-slate-500 font-semibold">{coach.notes}</div>
              </div>

              <div className="md:col-span-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="text-[11px] text-indigo-700 font-black uppercase tracking-wider mb-2">Next NPC line</div>
                <div className="text-indigo-950 font-extrabold text-base leading-snug">“{coach.next_npc_line}”</div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      speak(coach.next_npc_line, accent, 0.95);
                      vibrate(8);
                    }}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 active:scale-95"
                  >
                    🔊 Play Next
                  </button>

                  <button
                    onClick={() => {
                      setTranscript('');
                      setCoach(null);
                      setApiError('');
                      setMicError('');
                      setNpcLine(coach.next_npc_line);
                      vibrate(8);
                    }}
                    className="px-4 py-2 rounded-2xl bg-white border border-indigo-200 text-indigo-800 font-extrabold hover:bg-indigo-100/40 active:scale-95"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer helper */}
        <div className="mt-4 text-xs text-slate-400 font-semibold">
          Tips: Speak clearly. Short answers are okay. You can repeat NPC with <b>Play</b>.
        </div>
      </div>

      {/* Sticky bottom controls */}
      <div className="sticky bottom-0 w-full bg-slate-50/95 backdrop-blur border-t border-slate-200">
        <div className="w-full max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-bold">
            Shortcuts: <b>Space</b>=Mic · <b>E</b>=Evaluate · <b>P</b>=Play NPC · <b>R</b>=Next Prompt
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSpeakNpc}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 font-extrabold hover:bg-slate-50 active:scale-95"
            >
              🔊 NPC
            </button>

            {!isListening ? (
              <button
                onClick={startListening}
                className="px-4 py-2 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 active:scale-95"
              >
                🎙️ Mic
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-95"
              >
                ⏹ Stop
              </button>
            )}

            <button
              onClick={evaluateWithGemini}
              disabled={isLoadingAI || !transcript.trim()}
              className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              ✅ Eval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
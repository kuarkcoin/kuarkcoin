'use client';

import Link from 'next/link';

export default function VerbSensePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 text-[11px] font-black uppercase tracking-wider">
          🔤 Verb Sense
        </div>

        <h1 className="mt-4 text-3xl md:text-4xl font-black text-slate-900">
          Verb Sense
        </h1>

        <p className="mt-3 text-slate-600 font-semibold leading-relaxed">
          Choose the verb that sounds <b>natural</b> in real spoken English.
          <br />
          No grammar rules. Just instinct.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-500 font-bold mb-1">Example</div>
          <div className="text-xl font-black text-slate-900">
            I’ll <span className="text-indigo-600">___</span> you later.
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <div className="px-4 py-2 rounded-xl bg-white border font-bold text-slate-700">say</div>
            <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">call ✓</div>
            <div className="px-4 py-2 rounded-xl bg-white border font-bold text-slate-700">speak</div>
          </div>
        </div>

        <Link
          href="/verbsense/play"
          className="mt-8 block w-full rounded-2xl bg-slate-900 text-white font-black text-lg py-4 hover:bg-slate-800 active:scale-95 transition"
        >
          ▶ Start Playing
        </Link>

        <Link
          href="/"
          className="mt-4 block text-sm font-bold text-slate-400 hover:text-slate-600"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
// src/hooks/useSignals.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string; // BUY/SELL
  price: number | null;
  score: number | null;
  reasons: string | null;
  outcome: "WIN" | "LOSS" | null;
};

type UseSignalsOpts = {
  pollMs?: number; // visible tab polling
};

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e;
  return fallback;
}

export function useSignals(opts: UseSignalsOpts = {}) {
  // visible sekmede varsayılan 10s, ama minimumu 10s bırakıyoruz
  const pollMs = Math.max(opts.pollMs ?? 10000, 10000);

  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);

  const [todayTopBuy, setTodayTopBuy] = useState<SignalRow[]>([]);
  const [todayTopSell, setTodayTopSell] = useState<SignalRow[]>([]);

  // ✅ kullanıcıya/ileride UI'ye gösterebilmen için
  const [error, setError] = useState<string | null>(null);

  // en son iyi state snapshot (rollback için)
  const snapshotRef = useRef<SignalRow[]>([]);
  // aynı anda iki refresh çakışmasın
  const inFlightRef = useRef(false);

  // fetch abort controller’ları
  const abortSignalsRef = useRef<AbortController | null>(null);
  const abortTopRef = useRef<AbortController | null>(null);

  const loadSignals = useCallback(async () => {
    abortSignalsRef.current?.abort();
    const ac = new AbortController();
    abortSignalsRef.current = ac;

    try {
      setLoadingSignals(true);
      const res = await fetch("/api/signals", {
        cache: "no-store",
        signal: ac.signal,
      });

      if (!res.ok) {
        let msg = "Signals fetch failed";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const json = await res.json();
      const rows = (json.data ?? []) as SignalRow[];
      setSignals(rows);
      setError(null);
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;
      console.error("Signals yüklenemedi:", e);
      setError(getErrorMessage(e, "Sinyaller alınamadı"));
    } finally {
      setLoadingSignals(false);
    }
  }, []);

  const loadTodayTop = useCallback(async () => {
    abortTopRef.current?.abort();
    const ac = new AbortController();
    abortTopRef.current = ac;

    try {
      const res = await fetch("/api/signals?scope=todayTop", {
        cache: "no-store",
        signal: ac.signal,
      });

      if (!res.ok) {
        let msg = "Top fetch failed";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const json = await res.json();
      setTodayTopBuy((json.topBuy ?? []) as SignalRow[]);
      setTodayTopSell((json.topSell ?? []) as SignalRow[]);
      setError(null);
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;
      console.error("Günlük Top listesi alınamadı:", e);
      setError(getErrorMessage(e, "Top listesi alınamadı"));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await Promise.all([loadSignals(), loadTodayTop()]);
    } finally {
      inFlightRef.current = false;
    }
  }, [loadSignals, loadTodayTop]);

  const setOutcome = useCallback(
    async (id: number, outcome: "WIN" | "LOSS" | null) => {
      // snapshot al (rollback için)
      snapshotRef.current = signals;

      // optimistic update
      setSignals((prev) => prev.map((r) => (r.id === id ? { ...r, outcome } : r)));

      try {
        const res = await fetch("/api/signals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, outcome }),
        });

        if (!res.ok) {
          let msg = "Update failed";
          try {
            const j = await res.json();
            msg = j?.error || msg;
          } catch {}
          throw new Error(msg);
        }

        setError(null);
        // DB ile senkron (istersen kaldırabiliriz ama güvenli)
        await refreshAll();
      } catch (e) {
        console.error("Outcome update failed:", e);
        setSignals(snapshotRef.current); // rollback
        setError(getErrorMessage(e, "Durum güncellenemedi"));
      }
    },
    [signals, refreshAll]
  );

  // ✅ Adaptive polling: sekme arka planda → daha seyrek (min 60s)
  useEffect(() => {
    let t: number | null = null;

    const start = () => {
      if (t) window.clearInterval(t);

      const visible = document.visibilityState === "visible";
      const interval = visible ? pollMs : Math.max(pollMs * 6, 60000);

      t = window.setInterval(() => {
        refreshAll();
      }, interval);
    };

    // initial
    refreshAll();
    start();

    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (t) window.clearInterval(t);

      abortSignalsRef.current?.abort();
      abortTopRef.current?.abort();
    };
  }, [pollMs, refreshAll]);

  // İstersen ileride UI’da kullanırsın diye
  const hasTopData = useMemo(
    () => todayTopBuy.length + todayTopSell.length > 0,
    [todayTopBuy.length, todayTopSell.length]
  );

  return {
    signals,
    loadingSignals,
    todayTopBuy,
    todayTopSell,
    refreshAll,
    setOutcome,

    // ✅ yeni alanlar (TerminalPage kullanmak zorunda değil)
    error,
    hasTopData,
  };
}
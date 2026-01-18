// src/hooks/useSignals.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: string;
  price: number | null;
  score: number | null;
  reasons: string | null;
  outcome: "WIN" | "LOSS" | null;
};

type Options = {
  pollMs?: number;
};

export function useSignals(opts: Options = {}) {
  const pollMs = opts.pollMs ?? 10000;

  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);

  const [todayTopBuy, setTodayTopBuy] = useState<SignalRow[]>([]);
  const [todayTopSell, setTodayTopSell] = useState<SignalRow[]>([]);

  const loadSignals = useCallback(async () => {
    try {
      setLoadingSignals(true);
      const res = await fetch("/api/signals", { cache: "no-store" });
      if (!res.ok) throw new Error("Signals fetch failed");
      const json = await res.json();
      setSignals(json.data ?? []);
    } catch (e) {
      console.error("Signals yüklenemedi:", e);
    } finally {
      setLoadingSignals(false);
    }
  }, []);

  const loadTodayTop = useCallback(async () => {
    try {
      const res = await fetch("/api/signals?scope=todayTop", { cache: "no-store" });
      if (!res.ok) throw new Error("Top fetch failed");
      const json = await res.json();
      setTodayTopBuy(json.topBuy ?? []);
      setTodayTopSell(json.topSell ?? []);
    } catch (e) {
      console.error("Günlük Top listesi alınamadı:", e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSignals(), loadTodayTop()]);
  }, [loadSignals, loadTodayTop]);

  // Optimistic update helper
  const snapshotRef = useRef<SignalRow[]>([]);
  const setOutcome = useCallback(
    async (id: number, outcome: "WIN" | "LOSS" | null) => {
      snapshotRef.current = signals;
      setSignals((prev) => prev.map((r) => (r.id === id ? { ...r, outcome } : r)));

      try {
        const res = await fetch("/api/signals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, outcome }),
        });
        if (!res.ok) throw new Error("Update failed");
        await refreshAll();
      } catch (e) {
        setSignals(snapshotRef.current);
        alert("Durum güncellenemedi.");
      }
    },
    [signals, refreshAll]
  );

  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, pollMs);
    return () => clearInterval(t);
  }, [refreshAll, pollMs]);

  return {
    signals,
    loadingSignals,
    todayTopBuy,
    todayTopSell,
    refreshAll,
    setOutcome,
  };
}
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
  // İstersen ileride kapatabilirsin:
  useServerTop?: boolean; // /api/signals?scope=todayTop kullansın mı?
};

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e;
  return fallback;
}

// ✅ TR gün hesabı (UTC buglarını bitirir)
function isTodayTR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return fmt.format(d) === fmt.format(now);
}

function normalizeSignal(s: string | null | undefined) {
  return String(s || "").trim().toUpperCase();
}

export function useSignals(opts: UseSignalsOpts = {}) {
  // visible sekmede varsayılan 10s, ama minimumu 10s bırakıyoruz
  const pollMs = Math.max(opts.pollMs ?? 10000, 10000);
  const useServerTop = opts.useServerTop ?? false; // ✅ default: frontend hesaplasın

  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);

  // server'dan gelirse doldurabiliriz ama şart değil
  const [serverTopBuy, setServerTopBuy] = useState<SignalRow[]>([]);
  const [serverTopSell, setServerTopSell] = useState<SignalRow[]>([]);

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

  // ✅ Opsiyonel: server top çağrısı (buglı ise kapalı kalsın)
  const loadServerTop = useCallback(async () => {
    if (!useServerTop) return;

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
      setServerTopBuy((json.topBuy ?? []) as SignalRow[]);
      setServerTopSell((json.topSell ?? []) as SignalRow[]);
      setError(null);
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;
      console.error("Günlük Top listesi alınamadı:", e);
      // server top bozulsa bile UI çalışsın diye error basmak opsiyonel:
      setError(getErrorMessage(e, "Top listesi alınamadı"));
    }
  }, [useServerTop]);

  const refreshAll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      // ✅ Önce signals, sonra opsiyonel server top
      await loadSignals();
      await loadServerTop();
    } finally {
      inFlightRef.current = false;
    }
  }, [loadSignals, loadServerTop]);

  const setOutcome = useCallback(
    async (id: number, outcome: "WIN" | "LOSS" | null) => {
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
        await refreshAll();
      } catch (e) {
        console.error("Outcome update failed:", e);
        setSignals(snapshotRef.current); // rollback
        setError(getErrorMessage(e, "Durum güncellenemedi"));
      }
    },
    [signals, refreshAll]
  );

  // ✅ Frontend hesaplı TOP5 (TR buglarını bitirir)
  const computedTop = useMemo(() => {
    const todays = signals.filter((r) => isTodayTR(r.created_at));

    const topBuy = [...todays]
      .filter((r) => normalizeSignal(r.signal) === "BUY")
      .sort((a, b) => (b.score ?? -999999) - (a.score ?? -999999))
      .slice(0, 5);

    const topSell = [...todays]
      .filter((r) => normalizeSignal(r.signal) === "SELL")
      .sort((a, b) => (b.score ?? -999999) - (a.score ?? -999999))
      .slice(0, 5);

    return { topBuy, topSell };
  }, [signals]);

  // ✅ dışarıya dönen TOP: server top doluysa onu kullan, yoksa computed
  const todayTopBuy = useMemo(() => {
    return serverTopBuy.length ? serverTopBuy : computedTop.topBuy;
  }, [serverTopBuy, computedTop.topBuy]);

  const todayTopSell = useMemo(() => {
    return serverTopSell.length ? serverTopSell : computedTop.topSell;
  }, [serverTopSell, computedTop.topSell]);

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

  const hasTopData = useMemo(
    () => todayTopBuy.length + todayTopSell.length > 0,
    [todayTopBuy.length, todayTopSell.length]
  );

  return {
    signals,
    loadingSignals,

    // ✅ artık her koşulda dolması gereken top listeler:
    todayTopBuy,
    todayTopSell,

    refreshAll,
    setOutcome,

    error,
    hasTopData,
  };
}
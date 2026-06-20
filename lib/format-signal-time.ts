export type SignalFreshness = {
  isNew: boolean;
  isFresh: boolean;
  ageMs: number | null;
};

const MINUTE_MS = 60 * 1000;
const NEW_SIGNAL_WINDOW_MS = 15 * MINUTE_MS;
const FRESH_SIGNAL_WINDOW_MS = 60 * MINUTE_MS;

export function getSignalFreshness(createdAt: string | null | undefined, now = new Date()): SignalFreshness {
  if (!createdAt) return { isNew: false, isFresh: false, ageMs: null };

  const createdDate = new Date(createdAt);
  const createdTime = createdDate.getTime();
  const nowTime = now.getTime();

  if (Number.isNaN(createdTime) || Number.isNaN(nowTime)) {
    return { isNew: false, isFresh: false, ageMs: null };
  }

  const ageMs = nowTime - createdTime;

  if (ageMs < 0) {
    return { isNew: true, isFresh: true, ageMs };
  }

  return {
    isNew: ageMs <= NEW_SIGNAL_WINDOW_MS,
    isFresh: ageMs <= FRESH_SIGNAL_WINDOW_MS,
    ageMs,
  };
}

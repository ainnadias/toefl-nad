export const REVIEW_INTERVALS = [1, 3, 7, 14] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_SESSION_LIMIT = 10;

export interface ReviewSrsEntry {
  interval: number;
  dueAt: number;
  lastResult: "correct" | "wrong";
}

function nextIntervalAfterCorrect(currentInterval: number): number {
  const idx = REVIEW_INTERVALS.indexOf(
    currentInterval as (typeof REVIEW_INTERVALS)[number]
  );
  if (idx === -1 || idx === REVIEW_INTERVALS.length - 1) {
    return REVIEW_INTERVALS[REVIEW_INTERVALS.length - 1];
  }
  return REVIEW_INTERVALS[idx + 1];
}

/** Salah -> interval kembali ke 1 hari. Benar (hanya kalau sudah ada di antrean) -> naik interval. */
export function updateSrsEntry(
  existing: ReviewSrsEntry | undefined,
  correct: boolean,
  now: number
): ReviewSrsEntry | undefined {
  if (!correct) {
    return { interval: REVIEW_INTERVALS[0], dueAt: now + REVIEW_INTERVALS[0] * DAY_MS, lastResult: "wrong" };
  }
  if (!existing) return existing;
  const interval = nextIntervalAfterCorrect(existing.interval);
  return { interval, dueAt: now + interval * DAY_MS, lastResult: "correct" };
}

export function getDueQuestionIds(
  srs: Record<string, ReviewSrsEntry>,
  now: number,
  limit = REVIEW_SESSION_LIMIT
): string[] {
  return Object.entries(srs)
    .filter(([, entry]) => entry.dueAt <= now)
    .sort((a, b) => a[1].dueAt - b[1].dueAt)
    .slice(0, limit)
    .map(([id]) => id);
}

export function countDue(srs: Record<string, ReviewSrsEntry>, now: number): number {
  return Object.values(srs).filter((entry) => entry.dueAt <= now).length;
}

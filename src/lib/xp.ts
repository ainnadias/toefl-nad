export interface LevelDefinition {
  level: number;
  name: string;
  threshold: number;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, name: "Rookie Listener", threshold: 0 },
  { level: 2, name: "Curious Reader", threshold: 100 },
  { level: 3, name: "Grammar Apprentice", threshold: 250 },
  { level: 4, name: "Vocab Explorer", threshold: 450 },
  { level: 5, name: "Structure Scholar", threshold: 700 },
  { level: 6, name: "Reading Strategist", threshold: 1000 },
  { level: 7, name: "Listening Ace", threshold: 1400 },
  { level: 8, name: "TOEFL Challenger", threshold: 1900 },
  { level: 9, name: "Section Master", threshold: 2500 },
  { level: 10, name: "Score Hunter", threshold: 3300 },
  { level: 11, name: "TOEFL Virtuoso", threshold: 4300 },
  { level: 12, name: "Legend of TOEFL", threshold: 5500 },
];

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  xpIntoLevel: number;
  xpToNextLevel: number | null;
  levelStartXp: number;
  nextLevelXp: number | null;
  isMaxLevel: boolean;
}

export function getLevelInfo(xp: number): LevelInfo {
  let current = LEVELS[0];
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].threshold) {
      current = LEVELS[i];
      idx = i;
    } else {
      break;
    }
  }
  const next = LEVELS[idx + 1] ?? null;
  return {
    level: current.level,
    name: current.name,
    xp,
    xpIntoLevel: xp - current.threshold,
    xpToNextLevel: next ? next.threshold - xp : null,
    levelStartXp: current.threshold,
    nextLevelXp: next ? next.threshold : null,
    isMaxLevel: next === null,
  };
}

export function getLevelName(level: number): string {
  return LEVELS.find((l) => l.level === level)?.name ?? "Unknown";
}

/** 1 freeze streak harian didapat per level yang berhasil dinaiki. */
export function freezesGrantedForLevelUp(fromLevel: number, toLevel: number): number {
  return Math.max(0, toLevel - fromLevel);
}

const SPEED_BONUS_THRESHOLD_SECONDS = 15;
const SPEED_BONUS_XP = 5;
const BASE_CORRECT_XP = 10;

/** Combo = jumlah jawaban benar beruntun (termasuk jawaban yang baru saja benar). */
export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1.5;
  return 1;
}

export interface AnswerOutcome {
  correct: boolean;
  newCombo: number;
  multiplier: number;
  speedBonus: boolean;
  xpEarned: number;
}

export function computeAnswerOutcome(
  correct: boolean,
  elapsedSeconds: number,
  comboBefore: number
): AnswerOutcome {
  const newCombo = correct ? comboBefore + 1 : 0;
  if (!correct) {
    return { correct, newCombo, multiplier: 1, speedBonus: false, xpEarned: 0 };
  }
  const multiplier = comboMultiplier(newCombo);
  const speedBonus = elapsedSeconds < SPEED_BONUS_THRESHOLD_SECONDS;
  const rawXp = BASE_CORRECT_XP + (speedBonus ? SPEED_BONUS_XP : 0);
  const xpEarned = Math.round(rawXp * multiplier);
  return { correct, newCombo, multiplier, speedBonus, xpEarned };
}

/** Bonus XP sekali di akhir sesi, makin besar kalau skornya makin tinggi. */
export function sessionCompletionBonus(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(50 * (score / total));
}

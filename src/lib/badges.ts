import { BADGES, type BadgeId } from "../data/badges";
import type { Section } from "../types/question";

export interface SectionAccuracy {
  attempted: number;
  correct: number;
}

export interface BadgeStats {
  level: number;
  currentStreak: number;
  totalCorrect: number;
  totalSessions: number;
  bestComboEver: number;
  perfectSetEver: boolean;
  speedDemonEver: boolean;
  comebackEver: boolean;
  pathNodeCompletedEver: boolean;
  reviewCompletedEver: boolean;
  mockCompletedEver: boolean;
  sectionAccuracy: Record<Section, SectionAccuracy>;
}

const SECTION_ACCURACY_MIN: Record<Section, number> = {
  listening: 20,
  reading: 20,
  structure: 10,
};

function hasSectionMastery(stats: BadgeStats, section: Section): boolean {
  const acc = stats.sectionAccuracy[section];
  if (acc.attempted < SECTION_ACCURACY_MIN[section]) return false;
  return acc.correct / acc.attempted >= 0.9;
}

const CHECKS: Record<BadgeId, (stats: BadgeStats) => boolean> = {
  "first-step": (s) => s.totalSessions >= 1,
  "streak-3": (s) => s.currentStreak >= 3,
  "streak-7": (s) => s.currentStreak >= 7,
  "correct-50": (s) => s.totalCorrect >= 50,
  "correct-100": (s) => s.totalCorrect >= 100,
  "perfect-set": (s) => s.perfectSetEver,
  "speed-demon": (s) => s.speedDemonEver,
  "listening-pro": (s) => hasSectionMastery(s, "listening"),
  "reading-rat": (s) => hasSectionMastery(s, "reading"),
  "structure-sensei": (s) => hasSectionMastery(s, "structure"),
  comeback: (s) => s.comebackEver,
  "combo-x3": (s) => s.bestComboEver >= 10,
  "level-5": (s) => s.level >= 5,
  "path-pioneer": (s) => s.pathNodeCompletedEver,
  reviewer: (s) => s.reviewCompletedEver,
  "mock-debut": (s) => s.mockCompletedEver,
};

/** Mengembalikan badge id yang baru terbuka (belum ada di `alreadyUnlocked`). */
export function evaluateBadges(
  stats: BadgeStats,
  alreadyUnlocked: Record<string, number>
): BadgeId[] {
  const newlyUnlocked: BadgeId[] = [];
  for (const badge of BADGES) {
    if (alreadyUnlocked[badge.id] !== undefined) continue;
    if (CHECKS[badge.id](stats)) newlyUnlocked.push(badge.id);
  }
  return newlyUnlocked;
}

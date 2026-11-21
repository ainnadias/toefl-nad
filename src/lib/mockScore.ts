import type { Section } from "../types/question";

export interface MockSectionTally {
  section: Section;
  correct: number;
  total: number;
}

const SCALED_MIN = 20;
const SCALED_MAX = 68;
export const MOCK_SCORE_MIN = 310;
export const MOCK_SCORE_MAX = 677;

function sectionScaledScore(correct: number, total: number): number {
  if (total <= 0) return SCALED_MIN;
  const percent = correct / total;
  return SCALED_MIN + percent * (SCALED_MAX - SCALED_MIN);
}

/**
 * Estimasi skor TOEFL PBT skala 310-677, pakai pendekatan umum
 * (rata-rata scaled score per section x 10). Ini ESTIMASI, bukan
 * skor resmi ETS (tabel konversi asli tidak dipublikasikan).
 */
export function estimateMockScore(sections: MockSectionTally[]): number {
  const withQuestions = sections.filter((s) => s.total > 0);
  if (withQuestions.length === 0) return MOCK_SCORE_MIN;
  const avgScaled =
    withQuestions.reduce((sum, s) => sum + sectionScaledScore(s.correct, s.total), 0) /
    withQuestions.length;
  const total = Math.round(avgScaled * 10);
  return Math.min(MOCK_SCORE_MAX, Math.max(MOCK_SCORE_MIN, total));
}

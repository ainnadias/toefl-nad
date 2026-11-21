import type { Section } from "../types/question";

/** Urutan section Mock Test mengikuti format TOEFL PBT asli. */
export const MOCK_SECTION_ORDER: Section[] = ["listening", "structure", "reading"];

/**
 * Rasio menit/soal, diturunkan dari format TOEFL PBT asli:
 * Listening ~35 menit/50 soal, Structure 25 menit/40 soal, Reading 55 menit/50 soal.
 * Durasi aktual sesi Mock Test diskalakan proporsional dari rasio ini kali jumlah
 * soal "ok" yang benar-benar tersedia, supaya otomatis menyesuaikan saat soal
 * baru ditambahkan di Fase 6.
 */
export const MOCK_MINUTES_PER_QUESTION: Record<Section, number> = {
  listening: 35 / 50,
  structure: 25 / 40,
  reading: 55 / 50,
};

export function getMockSectionDurationSeconds(section: Section, questionCount: number): number {
  const minutes = MOCK_MINUTES_PER_QUESTION[section] * questionCount;
  return Math.max(60, Math.round(minutes * 60));
}

import type { Question, Section } from "../types/question";

const DATA_URL = "/data/longman-pretest.json";

let cache: Promise<Question[]> | null = null;

async function fetchQuestions(): Promise<Question[]> {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Gagal memuat soal (${res.status})`);
  }
  const all: Question[] = await res.json();
  return all.filter((q) => q.status === "ok");
}

export function loadQuestions(): Promise<Question[]> {
  if (!cache) {
    cache = fetchQuestions();
  }
  return cache;
}

export async function getQuestionsBySection(section: Section): Promise<Question[]> {
  const all = await loadQuestions();
  return all.filter((q) => q.section === section);
}

export async function countBySection(): Promise<Record<Section, number>> {
  const all = await loadQuestions();
  const counts: Record<Section, number> = { listening: 0, structure: 0, reading: 0 };
  for (const q of all) {
    counts[q.section] += 1;
  }
  return counts;
}

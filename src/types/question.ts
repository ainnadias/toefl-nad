export type Section = "listening" | "structure" | "reading";

export type ListeningPart = "A" | "B" | "C";

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export type AnswerLetter = "A" | "B" | "C" | "D";

/** Rujukan ke PDF asli untuk info tambahan (penjelasan, tips, dll), supaya bisa dicocokkan manual. */
export interface InfoSource {
  file: string;
  /** Angka, rentang (misal "12-13"), atau null kalau halamannya belum bisa dipastikan. */
  page: number | string | null;
  /** true kalau teksnya sudah dicocokkan langsung dengan halaman itu di PDF. */
  verified: boolean;
  /** true kalau ini data seed sementara untuk uji coba UI, bukan hasil pencocokan produksi penuh. */
  seed?: boolean;
}

export interface Question {
  id: string;
  section: Section;
  setId: string;
  part?: ListeningPart | null;
  audio: string | null;
  passage: string | null;
  question: string;
  options: QuestionOptions;
  answer: AnswerLetter;
  explanation: string | null;
  /** Sumber PDF untuk `explanation`, null kalau belum ada atau tidak bisa dilacak. */
  source: InfoSource | null;
  difficulty: "easy" | "medium" | "hard" | null;
  status: "ok" | "incomplete";
  statusNote: string | null;
}

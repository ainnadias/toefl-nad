export type BadgeId =
  | "first-step"
  | "streak-3"
  | "streak-7"
  | "correct-50"
  | "correct-100"
  | "perfect-set"
  | "speed-demon"
  | "listening-pro"
  | "reading-rat"
  | "structure-sensei"
  | "comeback"
  | "combo-x3"
  | "level-5"
  | "path-pioneer"
  | "reviewer"
  | "mock-debut";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  /** Ditampilkan setelah badge terbuka. */
  description: string;
  /** Petunjuk cara membuka, ditampilkan saat masih terkunci. */
  hint: string;
  /** Nama ikon lucide-react. */
  icon: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first-step",
    name: "First Step",
    description: "Menyelesaikan sesi latihan pertama.",
    hint: "Selesaikan 1 sesi latihan apa pun.",
    icon: "Footprints",
  },
  {
    id: "streak-3",
    name: "3-Day Streak",
    description: "Belajar 3 hari berturut-turut.",
    hint: "Capai target harian 3 hari berturut-turut.",
    icon: "Flame",
  },
  {
    id: "streak-7",
    name: "7-Day Streak",
    description: "Belajar 7 hari berturut-turut.",
    hint: "Capai target harian 7 hari berturut-turut.",
    icon: "Flame",
  },
  {
    id: "correct-50",
    name: "50 Correct",
    description: "Menjawab 50 soal dengan benar.",
    hint: "Jawab total 50 soal dengan benar (akumulasi semua sesi).",
    icon: "CheckCircle2",
  },
  {
    id: "correct-100",
    name: "100 Correct",
    description: "Menjawab 100 soal dengan benar.",
    hint: "Jawab total 100 soal dengan benar (akumulasi semua sesi).",
    icon: "CheckCircle2",
  },
  {
    id: "perfect-set",
    name: "Perfect Set",
    description: "Skor 100% dalam satu sesi latihan.",
    hint: "Jawab semua soal benar dalam satu sesi.",
    icon: "Star",
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Sebagian besar jawaban cepat dalam satu sesi.",
    hint: "Jawab cepat (<15 detik) untuk hampir semua soal di satu sesi (min. 5 soal).",
    icon: "Zap",
  },
  {
    id: "listening-pro",
    name: "Listening Pro",
    description: "Akurasi tinggi di section Listening.",
    hint: "Capai akurasi >=90% di Listening (min. 20 soal dijawab).",
    icon: "Headphones",
  },
  {
    id: "reading-rat",
    name: "Reading Rat",
    description: "Akurasi tinggi di section Reading.",
    hint: "Capai akurasi >=90% di Reading (min. 20 soal dijawab).",
    icon: "BookOpen",
  },
  {
    id: "structure-sensei",
    name: "Structure Sensei",
    description: "Akurasi tinggi di section Structure.",
    hint: "Capai akurasi >=90% di Structure (min. 10 soal dijawab).",
    icon: "PenLine",
  },
  {
    id: "comeback",
    name: "Comeback",
    description: "Kembali belajar setelah absen beberapa hari.",
    hint: "Mulai sesi baru setelah absen 3 hari atau lebih.",
    icon: "Sunrise",
  },
  {
    id: "combo-x3",
    name: "Combo x3",
    description: "Mencapai combo multiplier x3.",
    hint: "Jawab 10 soal benar berturut-turut dalam satu sesi.",
    icon: "Sparkles",
  },
  {
    id: "level-5",
    name: "Level 5",
    description: "Mencapai level 5.",
    hint: "Kumpulkan XP sampai level 5.",
    icon: "Trophy",
  },
  {
    id: "path-pioneer",
    name: "Path Pioneer",
    description: "Menyelesaikan node pertama di Learning Path.",
    hint: "Selesaikan satu node di halaman Learning Path.",
    icon: "Map",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Menyelesaikan sesi Review Harian.",
    hint: "Selesaikan satu sesi Review Harian.",
    icon: "RotateCcw",
  },
  {
    id: "mock-debut",
    name: "Mock Debut",
    description: "Menyelesaikan mock test pertama.",
    hint: "Selesaikan satu mock test penuh.",
    icon: "ClipboardCheck",
  },
];

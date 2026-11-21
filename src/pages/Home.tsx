import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Headphones,
  BookOpen,
  PenLine,
  Flame,
  Target,
  Snowflake,
  Map as MapIcon,
  RotateCcw,
  ClipboardCheck,
} from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import XpBar from "../components/XpBar";
import { countBySection, getQuestionsBySection, loadQuestions } from "../lib/loadQuestions";
import { countDue, getDueQuestionIds } from "../lib/review";
import {
  DAILY_GOAL_OPTIONS,
  getSectionProgress,
  getTodayCount,
  useAppStore,
} from "../store/appStore";
import type { Section } from "../types/question";

const SECTIONS: { key: Section; label: string; icon: typeof Headphones }[] = [
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "structure", label: "Structure & Written Expression", icon: PenLine },
  { key: "reading", label: "Reading Comprehension", icon: BookOpen },
];

export default function Home() {
  const navigate = useNavigate();
  const currentSession = useAppStore((s) => s.currentSession);
  const currentMockSession = useAppStore((s) => s.currentMockSession);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const startSession = useAppStore((s) => s.startSession);
  const xp = useAppStore((s) => s.xp);
  const streak = useAppStore((s) => s.currentStreak);
  const streakFreezes = useAppStore((s) => s.streakFreezes);
  const dailyGoal = useAppStore((s) => s.dailyGoal);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const reviewSrs = useAppStore((s) => s.reviewSrs);
  const [counts, setCounts] = useState<Record<Section, number> | null>(null);
  const [starting, setStarting] = useState<Section | null>(null);
  const [startingReview, setStartingReview] = useState(false);

  useEffect(() => {
    countBySection().then(setCounts);
  }, []);

  const todayCount = getTodayCount(sessionHistory);
  const dueCount = countDue(reviewSrs, Date.now());

  async function handleStart(section: Section) {
    setStarting(section);
    const questions = await getQuestionsBySection(section);
    startSession(section, questions.map((q) => q.id));
    navigate(`/practice/${section}`);
  }

  async function handleStartReview() {
    setStartingReview(true);
    const dueIds = getDueQuestionIds(reviewSrs, Date.now());
    const all = await loadQuestions();
    const byId = new Map(all.map((q) => [q.id, q]));
    const firstQuestion = byId.get(dueIds[0]);
    if (!firstQuestion) {
      setStartingReview(false);
      return;
    }
    startSession(firstQuestion.section, dueIds, { mode: "review" });
    navigate(`/practice/${firstQuestion.section}`);
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Halo! Siap latihan TOEFL hari ini?
        </h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Yuk kerjakan beberapa soal, sedikit demi sedikit juga maju.
        </p>
      </div>

      <Card>
        <XpBar xp={xp} />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-start gap-1">
          <Target className="h-6 w-6 text-primary-500" aria-hidden />
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Target harian
          </span>
          <span className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {Math.min(todayCount, dailyGoal)}/{dailyGoal} soal
          </span>
        </Card>
        <Card className="flex flex-col items-start gap-1">
          <Flame className="h-6 w-6 text-primary-500" aria-hidden />
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Streak
          </span>
          <span className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {streak} hari
          </span>
          {streakFreezes > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-accent-600 dark:text-accent-300">
              <Snowflake className="h-3.5 w-3.5" aria-hidden />
              {streakFreezes} freeze siap pakai
            </span>
          )}
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
          Target harian berapa soal?
        </span>
        <div className="flex gap-2">
          {DAILY_GOAL_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDailyGoal(option)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                dailyGoal === option
                  ? "bg-primary-500 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-stone-700 dark:text-primary-300">
            <MapIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">Learning Path</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Jalur belajar bertahap per section
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate("/path")}>
          Buka
        </Button>
      </Card>

      {dueCount > 0 && (
        <Card className="flex items-center justify-between gap-4 border-2 border-accent-500/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-600 dark:bg-stone-700 dark:text-accent-300">
              <RotateCcw className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100">Review Harian</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {dueCount} soal jatuh tempo untuk direview
              </p>
            </div>
          </div>
          <Button onClick={handleStartReview} disabled={startingReview}>
            Mulai
          </Button>
        </Card>
      )}

      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-stone-700 dark:text-primary-300">
            <ClipboardCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">Mock Test</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Simulasi 3 section, timer ketat, hasil di akhir
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate("/mock")}>
          Mulai
        </Button>
      </Card>

      {currentSession && (
        <Card className="flex items-center justify-between gap-4 border-2 border-primary-200">
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">
              Ada sesi latihan yang belum selesai
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Soal {currentSession.index + 1} dari {currentSession.questionIds.length}
            </p>
          </div>
          <Button onClick={() => navigate(`/practice/${currentSession.section}`)}>
            Lanjut belajar
          </Button>
        </Card>
      )}

      {currentMockSession && (
        <Card className="flex items-center justify-between gap-4 border-2 border-primary-200">
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">
              Ada Mock Test yang belum selesai
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Section {currentMockSession.currentSectionIndex + 1} dari{" "}
              {currentMockSession.sections.length}
            </p>
          </div>
          <Button onClick={() => navigate("/mock")}>Lanjut</Button>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const progress = getSectionProgress(sessionHistory, key);
          return (
            <Card key={key} className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-stone-700 dark:text-primary-300">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-800 dark:text-stone-100">{label}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {counts ? `${counts[key]} soal tersedia` : "Memuat..."}
                  {progress.attempted > 0 && ` · pernah benar ${progress.correct}/${progress.attempted}`}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleStart(key)}
                disabled={!counts || counts[key] === 0 || starting === key}
              >
                Mulai
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

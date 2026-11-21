import { Lock } from "lucide-react";
import Card from "../components/Card";
import XpBar from "../components/XpBar";
import { BADGES } from "../data/badges";
import { getBadgeIcon } from "../lib/badgeIcons";
import { getLevelInfo } from "../lib/xp";
import { getSectionProgress, useAppStore } from "../store/appStore";
import type { Section } from "../types/question";

const SECTION_LABELS: Record<Section, string> = {
  listening: "Listening",
  structure: "Structure & Written Expression",
  reading: "Reading Comprehension",
};

export default function Profile() {
  const xp = useAppStore((s) => s.xp);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const unlockedBadges = useAppStore((s) => s.unlockedBadges);
  const level = getLevelInfo(xp);

  const totalAnswered = sessionHistory.reduce((sum, s) => sum + s.total, 0);
  const totalCorrect = sessionHistory.reduce((sum, s) => sum + s.score, 0);
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const sections: Section[] = ["listening", "structure", "reading"];
  const unlockedCount = Object.keys(unlockedBadges).length;

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Profil</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Progres belajar dan koleksi badge kamu.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <XpBar xp={xp} />
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Level {level.level} &middot; {level.name}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-start gap-1">
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Total soal dijawab
          </span>
          <span className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {totalAnswered}
          </span>
        </Card>
        <Card className="flex flex-col items-start gap-1">
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Akurasi keseluruhan
          </span>
          <span className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {overallAccuracy}%
          </span>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-800 dark:text-stone-100">Akurasi per section</h2>
        {sections.map((section) => {
          const progress = getSectionProgress(sessionHistory, section);
          const percent =
            progress.attempted > 0
              ? Math.round((progress.correct / progress.attempted) * 100)
              : 0;
          return (
            <div key={section} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-stone-600 dark:text-stone-300">
                {SECTION_LABELS[section]}
              </span>
              <span className="font-medium text-stone-800 dark:text-stone-100">
                {progress.attempted > 0
                  ? `${progress.correct}/${progress.attempted} (${percent}%)`
                  : "Belum ada data"}
              </span>
            </div>
          );
        })}
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-stone-800 dark:text-stone-100">
          Badge ({unlockedCount}/{BADGES.length})
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((badge) => {
            const unlocked = unlockedBadges[badge.id] !== undefined;
            const Icon = getBadgeIcon(badge.icon);
            return (
              <Card
                key={badge.id}
                className={`flex flex-col items-center gap-2 p-4 text-center ${
                  unlocked ? "" : "opacity-60"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    unlocked
                      ? "bg-accent-100 text-accent-600 dark:bg-stone-700 dark:text-accent-300"
                      : "bg-stone-200 text-stone-400 dark:bg-stone-700 dark:text-stone-500"
                  }`}
                >
                  {unlocked ? <Icon className="h-6 w-6" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
                </div>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {badge.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {unlocked ? badge.description : badge.hint}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

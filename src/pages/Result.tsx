import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Flame, Target, XCircle, Zap } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Mascot, { randomCelebrateMessage } from "../components/Mascot";
import Modal from "../components/Modal";
import SourceBadge from "../components/SourceBadge";
import { celebrateDailyGoal, celebrateLevelUp, celebratePerfectScore } from "../lib/celebrate";
import { getQuestionsBySection } from "../lib/loadQuestions";
import { playBadgeSound, playLevelUpSound } from "../lib/sound";
import { findSession, getTodayCount, useAppStore } from "../store/appStore";
import type { Question } from "../types/question";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} detik`;
  return `${minutes} menit ${seconds} detik`;
}

export default function Result() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const dailyGoal = useAppStore((s) => s.dailyGoal);
  const session = sessionId ? findSession(sessionHistory, sessionId) : undefined;
  const [questionMap, setQuestionMap] = useState<Map<string, Question> | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (!session) return;
    getQuestionsBySection(session.section).then((qs) => {
      setQuestionMap(new Map(qs.map((q) => [q.id, q])));
    });
  }, [session]);

  const isPerfect = !!session && session.total > 0 && session.score === session.total;

  useEffect(() => {
    if (!session) return;
    if (session.levelUp) {
      setShowLevelUp(true);
      celebrateLevelUp();
      playLevelUpSound();
    } else if (isPerfect) {
      celebratePerfectScore();
      playBadgeSound();
    } else if (session.dailyGoalJustReached) {
      celebrateDailyGoal();
      playBadgeSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const todayCount = useMemo(() => getTodayCount(sessionHistory), [sessionHistory]);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const wrongAnswers = session.answers.filter((a) => !a.correct);
  const percent = session.total > 0 ? Math.round((session.score / session.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-400">
          Sesi selesai
        </p>
        <p className="text-4xl font-bold text-primary-600 dark:text-primary-300">
          {session.score}/{session.total}
        </p>
        <p className="text-stone-500 dark:text-stone-400">{percent}% benar</p>
        <p className="mt-1 text-sm text-stone-400">
          Waktu: {formatDuration(session.finishedAt - session.startedAt)}
        </p>
        <Mascot
          mood={isPerfect || session.levelUp ? "celebrate" : percent >= 50 ? "happy" : "encourage"}
          size={64}
          className="mt-2"
        />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center gap-1 p-4 text-center">
          <Zap className="h-5 w-5 text-primary-500" aria-hidden />
          <span className="text-lg font-bold text-stone-800 dark:text-stone-100">
            +{session.xpEarned}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">XP didapat</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 p-4 text-center">
          <Flame className="h-5 w-5 text-primary-500" aria-hidden />
          <span className="text-lg font-bold text-stone-800 dark:text-stone-100">
            {session.bestCombo}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">Combo terbaik</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 p-4 text-center">
          <Target className="h-5 w-5 text-primary-500" aria-hidden />
          <span className="text-lg font-bold text-stone-800 dark:text-stone-100">
            {Math.min(todayCount, dailyGoal)}/{dailyGoal}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">Target harian</span>
        </Card>
      </div>

      {session.levelUp && (
        <Card className="flex items-center justify-center gap-2 border-2 border-primary-200 text-center text-sm font-medium text-primary-700 dark:text-primary-200">
          Naik dari Level {session.levelUp.fromLevel} ({session.levelUp.fromName}) ke Level{" "}
          {session.levelUp.toLevel} ({session.levelUp.toName})!
        </Card>
      )}

      {wrongAnswers.length === 0 ? (
        <Card className="text-center text-stone-600 dark:text-stone-300">
          Semua jawaban benar, keren!
        </Card>
      ) : (
        <div>
          <h2 className="mb-3 font-semibold text-stone-800 dark:text-stone-100">
            Soal yang perlu direview ({wrongAnswers.length})
          </h2>
          <div className="flex flex-col gap-3">
            {wrongAnswers.map((answer) => {
              const q = questionMap?.get(answer.questionId);
              if (!q) return null;
              return (
                <Card key={answer.questionId} className="flex flex-col gap-2">
                  <p className="font-medium text-stone-800 dark:text-stone-100">
                    {q.question}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-danger-600">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Jawabanmu: {answer.selected ?? "-"} —{" "}
                      {answer.selected ? q.options[answer.selected] : "tidak dijawab"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-success-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Jawaban benar: {q.answer} — {q.options[q.answer]}
                    </span>
                  </div>
                  {q.explanation && (
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {q.explanation}
                      {q.source && <SourceBadge source={q.source} />}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Button onClick={() => navigate("/")}>Kembali ke Home</Button>

      <Modal
        open={showLevelUp}
        title="Naik Level!"
        onClose={() => setShowLevelUp(false)}
        footer={<Button onClick={() => setShowLevelUp(false)}>Asik!</Button>}
      >
        {session.levelUp && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot mood="celebrate" size={88} message={randomCelebrateMessage()} />
            <p>
              Level {session.levelUp.fromLevel} ({session.levelUp.fromName}) &rarr; Level{" "}
              {session.levelUp.toLevel} ({session.levelUp.toName})
            </p>
            {session.levelUp.freezesGained > 0 && (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Dapat {session.levelUp.freezesGained} streak freeze baru!
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

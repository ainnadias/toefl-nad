import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import Mascot from "../components/Mascot";
import { celebrateLevelUp } from "../lib/celebrate";
import { MOCK_SCORE_MAX, MOCK_SCORE_MIN } from "../lib/mockScore";
import { loadQuestions } from "../lib/loadQuestions";
import { playLevelUpSound } from "../lib/sound";
import { findMockSession, useAppStore } from "../store/appStore";
import type { Question, Section } from "../types/question";

const SECTION_LABELS: Record<Section, string> = {
  listening: "Listening",
  structure: "Structure & Written Expression",
  reading: "Reading Comprehension",
};

export default function MockResult() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const mockHistory = useAppStore((s) => s.mockHistory);
  const session = sessionId ? findMockSession(mockHistory, sessionId) : undefined;
  const [questionMap, setQuestionMap] = useState<Map<string, Question> | null>(null);

  useEffect(() => {
    loadQuestions().then((qs) => setQuestionMap(new Map(qs.map((q) => [q.id, q]))));
  }, []);

  useEffect(() => {
    if (session?.levelUp) {
      celebrateLevelUp();
      playLevelUpSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const totalCorrect = useMemo(
    () => (session ? session.sections.reduce((sum, s) => sum + s.correct, 0) : 0),
    [session]
  );
  const totalQuestions = useMemo(
    () => (session ? session.sections.reduce((sum, s) => sum + s.total, 0) : 0),
    [session]
  );

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-400">
          Mock Test selesai
        </p>
        <p className="text-4xl font-bold text-primary-600 dark:text-primary-300">
          {session.estimatedScore}
        </p>
        <p className="text-stone-500 dark:text-stone-400">
          Estimasi skala {MOCK_SCORE_MIN}-{MOCK_SCORE_MAX} &middot; bukan skor resmi
        </p>
        <p className="mt-1 text-sm text-stone-400">
          {totalCorrect}/{totalQuestions} jawaban benar &middot; +{session.xpEarned} XP
        </p>
        <Mascot mood={totalCorrect / Math.max(1, totalQuestions) >= 0.7 ? "happy" : "encourage"} size={64} className="mt-2" />
      </Card>

      {session.levelUp && (
        <Card className="flex items-center justify-center gap-2 border-2 border-primary-200 text-center text-sm font-medium text-primary-700 dark:text-primary-200">
          Naik dari Level {session.levelUp.fromLevel} ({session.levelUp.fromName}) ke Level{" "}
          {session.levelUp.toLevel} ({session.levelUp.toName})!
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {session.sections.map((sec) => {
          const percent = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0;
          return (
            <Card key={sec.section} className="flex items-center justify-between gap-3">
              <span className="font-semibold text-stone-800 dark:text-stone-100">
                {SECTION_LABELS[sec.section]}
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400">
                {sec.correct}/{sec.total} ({percent}%)
              </span>
            </Card>
          );
        })}
      </div>

      {questionMap && (
        <div className="flex flex-col gap-4">
          {session.sections.map((sec) => {
            const wrong = sec.questionIds.filter((qId) => sec.answers[qId] !== questionMap.get(qId)?.answer);
            if (wrong.length === 0) return null;
            return (
              <div key={sec.section}>
                <h2 className="mb-3 font-semibold text-stone-800 dark:text-stone-100">
                  {SECTION_LABELS[sec.section]} &middot; perlu direview ({wrong.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {wrong.map((qId) => {
                    const q = questionMap.get(qId);
                    if (!q) return null;
                    const selected = sec.answers[qId];
                    return (
                      <Card key={qId} className="flex flex-col gap-2">
                        <p className="font-medium text-stone-800 dark:text-stone-100">
                          {q.question}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-danger-600">
                          <XCircle className="h-4 w-4 shrink-0" />
                          <span>
                            Jawabanmu: {selected ?? "-"} &middot;{" "}
                            {selected ? q.options[selected] : "tidak dijawab"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-success-600">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            Jawaban benar: {q.answer} &middot; {q.options[q.answer]}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={() => navigate("/")}>Kembali ke Home</Button>
    </div>
  );
}

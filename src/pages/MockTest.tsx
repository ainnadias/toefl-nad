import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, LogOut } from "lucide-react";
import AudioPlayer from "../components/AudioPlayer";
import Button from "../components/Button";
import Card from "../components/Card";
import Modal from "../components/Modal";
import OptionButton from "../components/OptionButton";
import { MOCK_SECTION_ORDER } from "../data/mockConfig";
import { loadQuestions } from "../lib/loadQuestions";
import { useAppStore } from "../store/appStore";
import type { Question, Section } from "../types/question";

const SECTION_LABELS: Record<Section, string> = {
  listening: "Listening",
  structure: "Structure & Written Expression",
  reading: "Reading Comprehension",
};

function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface MockTestProps {
  /** Section yang diikutkan dan urutannya; default kombinasi penuh ala TOEFL PBT. */
  sections?: Section[];
}

export default function MockTest({ sections = MOCK_SECTION_ORDER }: MockTestProps) {
  const navigate = useNavigate();
  const currentMockSession = useAppStore((s) => s.currentMockSession);
  const startMockSession = useAppStore((s) => s.startMockSession);
  const setMockAnswer = useAppStore((s) => s.setMockAnswer);
  const goToMockQuestion = useAppStore((s) => s.goToMockQuestion);
  const advanceMockSection = useAppStore((s) => s.advanceMockSection);
  const finishMockSession = useAppStore((s) => s.finishMockSession);
  const abandonMockSession = useAppStore((s) => s.abandonMockSession);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    loadQuestions().then(setQuestions);
  }, []);

  useEffect(() => {
    if (!questions || currentMockSession) return;
    const sectionData = sections
      .map((section) => ({
        section,
        questionIds: questions.filter((q) => q.section === section).map((q) => q.id),
      }))
      .filter((s) => s.questionIds.length > 0);
    startMockSession(sectionData);
    // Hanya dijalankan sekali saat belum ada sesi mock aktif.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, currentMockSession]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    questions?.forEach((q) => map.set(q.id, q));
    return map;
  }, [questions]);

  const sectionState = currentMockSession?.sections[currentMockSession.currentSectionIndex];
  const isLastSection =
    !!currentMockSession &&
    currentMockSession.currentSectionIndex === currentMockSession.sections.length - 1;

  const remainingSeconds = sectionState
    ? Math.max(0, sectionState.durationSeconds - (now - sectionState.startedAt) / 1000)
    : 0;
  const timeIsUp = remainingSeconds <= 0;

  function handleFinish() {
    const finished = finishMockSession((questionId) => questionMap.get(questionId)?.answer);
    if (finished) navigate(`/mock/result/${finished.id}`);
  }

  useEffect(() => {
    if (!sectionState || !timeIsUp) return;
    if (isLastSection) {
      handleFinish();
    } else {
      advanceMockSection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeIsUp]);

  if (!questions || !currentMockSession || !sectionState) {
    return <p className="pt-10 text-center text-stone-500">Menyiapkan Mock Test...</p>;
  }

  const questionId = sectionState.questionIds[sectionState.currentIndex];
  const question = questionMap.get(questionId);
  const total = sectionState.questionIds.length;
  const answeredCount = Object.values(sectionState.answers).filter((a) => a).length;
  const selected = sectionState.answers[questionId] ?? null;

  function handleExit() {
    abandonMockSession();
    navigate("/");
  }

  function handleNextSection() {
    if (isLastSection) {
      handleFinish();
    } else {
      advanceMockSection();
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">
            Mock Test &middot; Section {currentMockSession.currentSectionIndex + 1}/
            {currentMockSession.sections.length}
          </p>
          <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
            {SECTION_LABELS[sectionState.section]}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
              remainingSeconds < 60
                ? "bg-danger-100 text-danger-600 dark:bg-danger-600/20"
                : "bg-primary-100 text-primary-700 dark:bg-stone-700 dark:text-primary-200"
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden />
            {formatTimer(remainingSeconds)}
          </div>
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            aria-label="Keluar dari Mock Test"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm hover:text-danger-500 dark:bg-stone-800 dark:text-stone-400"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-stone-500 dark:text-stone-400">
        {answeredCount}/{total} soal terjawab &middot; navigasi bebas, tanpa feedback langsung
      </p>

      <div className="flex flex-wrap gap-2">
        {sectionState.questionIds.map((id, i) => {
          const isAnswered = !!sectionState.answers[id];
          const isCurrent = i === sectionState.currentIndex;
          return (
            <button
              key={id}
              type="button"
              onClick={() => goToMockQuestion(i)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                isCurrent
                  ? "bg-primary-500 text-white"
                  : isAnswered
                    ? "bg-success-100 text-success-700 dark:bg-success-600/20 dark:text-success-300"
                    : "bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {question && (
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-5 md:grid-cols-2"
          >
            {question.passage && (
              <Card className="max-h-96 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-200 md:order-1 md:max-h-[32rem]">
                {question.passage}
              </Card>
            )}

            <div className={`flex flex-col gap-4 ${question.passage ? "md:order-2" : "md:col-span-2"}`}>
              {question.section === "listening" && question.audio && (
                <AudioPlayer key={question.audio} src={`/${question.audio}`} />
              )}

              <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">
                {question.question}
              </p>

              <div className="flex flex-col gap-3">
                {(["A", "B", "C", "D"] as const).map((letter) => (
                  <OptionButton
                    key={letter}
                    letter={letter}
                    text={question.options[letter]}
                    selected={selected === letter}
                    revealed={false}
                    isCorrectAnswer={false}
                    onClick={() => setMockAnswer(questionId, selected === letter ? null : letter)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  disabled={sectionState.currentIndex === 0}
                  onClick={() => goToMockQuestion(sectionState.currentIndex - 1)}
                >
                  Sebelumnya
                </Button>
                {sectionState.currentIndex + 1 < total ? (
                  <Button onClick={() => goToMockQuestion(sectionState.currentIndex + 1)}>
                    Soal selanjutnya
                  </Button>
                ) : (
                  <Button onClick={handleNextSection}>
                    {isLastSection ? "Selesai Mock Test" : "Lanjut ke Section Berikutnya"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <Modal
        open={confirmExit}
        title="Keluar dari Mock Test?"
        onClose={() => setConfirmExit(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmExit(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleExit}>
              Keluar
            </Button>
          </>
        }
      >
        Progres Mock Test ini akan hilang kalau kamu keluar sekarang.
      </Modal>
    </div>
  );
}

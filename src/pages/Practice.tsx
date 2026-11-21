import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame, LogOut, Play } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import Mascot, { randomEncourageMessage, randomHappyMessage } from "../components/Mascot";
import Modal from "../components/Modal";
import OptionButton from "../components/OptionButton";
import ProgressBar from "../components/ProgressBar";
import SourceBadge from "../components/SourceBadge";
import AudioPlayer, { type AudioPlayerHandle } from "../components/AudioPlayer";
import { celebrateLevelUp } from "../lib/celebrate";
import { comboMultiplier } from "../lib/xp";
import { getQuestionsBySection, loadQuestions } from "../lib/loadQuestions";
import { playCorrectSound, playLevelUpSound, playWrongSound } from "../lib/sound";
import { useAppStore } from "../store/appStore";
import type { AnswerLetter, Question, Section } from "../types/question";

export default function Practice() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const currentSession = useAppStore((s) => s.currentSession);
  const answerCurrent = useAppStore((s) => s.answerCurrent);
  const goToNext = useAppStore((s) => s.goToNext);
  const finishSession = useAppStore((s) => s.finishSession);
  const abandonSession = useAppStore((s) => s.abandonSession);
  const pendingLevelUp = useAppStore((s) => s.pendingLevelUp);
  const clearPendingLevelUp = useAppStore((s) => s.clearPendingLevelUp);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [selected, setSelected] = useState<AnswerLetter | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const questionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (pendingLevelUp) {
      celebrateLevelUp();
      playLevelUpSound();
    }
  }, [pendingLevelUp]);

  const sessionMode = currentSession?.mode;

  useEffect(() => {
    if (!section) return;
    if (sessionMode === "review") {
      loadQuestions().then(setQuestions);
    } else {
      getQuestionsBySection(section as Section).then(setQuestions);
    }
  }, [section, sessionMode]);

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    questions?.forEach((q) => map.set(q.id, q));
    return map;
  }, [questions]);

  // Urutan soal sesuai sesi (bukan urutan fetch) -- dipakai untuk mendeteksi
  // apakah soal saat ini adalah soal pertama dari satu file audio Listening,
  // supaya audio player tidak remount/reset tiap pindah soal dalam Part yang
  // sama (satu file audio dipakai untuk beberapa soal berurutan).
  const orderedQuestions = useMemo(() => {
    if (!currentSession || !questionMap.size) return [];
    return currentSession.questionIds
      .map((id) => questionMap.get(id))
      .filter((q): q is Question => Boolean(q));
  }, [currentSession, questionMap]);

  const index = currentSession?.index ?? 0;
  const questionId = currentSession?.questionIds[index];
  const question = questionId ? questionMap.get(questionId) : undefined;
  const total = currentSession?.questionIds.length ?? 0;
  const isLast = index + 1 >= total;

  const isFirstOfAudioGroup =
    index === 0 || orderedQuestions[index]?.audio !== orderedQuestions[index - 1]?.audio;

  useEffect(() => {
    if (!currentSession || !questionId) return;
    const existing = currentSession.answers.find((a) => a.questionId === questionId);
    if (existing) {
      setSelected(existing.selected);
      setRevealed(true);
    } else {
      setSelected(null);
      setRevealed(false);
      questionStartRef.current = Date.now();
    }
  }, [currentSession, questionId]);

  const existingAnswer = currentSession?.answers.find((a) => a.questionId === questionId);
  const combo = currentSession?.combo ?? 0;
  const multiplier = comboMultiplier(combo);
  const isCorrectSelection = revealed && !!question && selected === question.answer;

  const mascotMood = !revealed ? "normal" : isCorrectSelection ? "happy" : "encourage";
  const mascotMessage = useMemo(() => {
    if (!revealed) return undefined;
    return isCorrectSelection ? randomHappyMessage() : randomEncourageMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, revealed]);

  if (!currentSession || currentSession.section !== section) {
    return (
      <div className="pt-10 text-center">
        <p className="text-stone-600 dark:text-stone-300">
          Belum ada sesi latihan untuk section ini.
        </p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Kembali ke Home
        </Button>
      </div>
    );
  }

  if (!questions || !question) {
    return <p className="pt-10 text-center text-stone-500">Memuat soal...</p>;
  }

  function handleCheck() {
    if (!selected || !question) return;
    const elapsedSeconds = (Date.now() - questionStartRef.current) / 1000;
    answerCurrent(selected, question.answer, elapsedSeconds);
    setRevealed(true);
    if (selected === question.answer) playCorrectSound();
    else playWrongSound();
  }

  function handleNext() {
    if (isLast) {
      const finished = finishSession();
      if (finished) navigate(`/result/${finished.id}`);
      return;
    }
    goToNext();
  }

  function handleExit() {
    abandonSession();
    navigate("/");
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      {sessionMode === "review" && (
        <span className="w-fit rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-600 dark:bg-stone-700 dark:text-accent-300">
          Review Harian
        </span>
      )}
      <div className="flex items-center gap-4">
        <ProgressBar current={index} total={total} />
        {combo >= 2 && (
          <motion.div
            key={combo}
            initial={reduceMotion ? undefined : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary-100 px-3 py-1.5 text-sm font-bold text-primary-700 dark:bg-stone-700 dark:text-primary-200"
            aria-label={`Combo ${combo}, multiplier x${multiplier}`}
          >
            <Flame className="h-4 w-4" aria-hidden />
            {combo}
            {multiplier > 1 && <span>&times;{multiplier}</span>}
          </motion.div>
        )}
        <button
          type="button"
          onClick={() => setConfirmExit(true)}
          aria-label="Keluar dari sesi"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm hover:text-danger-500 dark:bg-stone-800 dark:text-stone-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {question.section === "listening" && question.audio && (
        <div className="sticky top-0 z-10 -mx-4 bg-primary-50/95 px-4 pb-3 pt-2 backdrop-blur dark:bg-stone-900/95 sm:-mx-6 sm:px-6">
          {isFirstOfAudioGroup && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-primary-100 px-4 py-3 dark:bg-stone-700">
              <button
                type="button"
                onClick={() => audioPlayerRef.current?.play()}
                aria-label={`Putar audio Part ${question.part ?? ""}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-md shadow-primary-500/30 hover:bg-primary-600"
              >
                <Play className="h-6 w-6" />
              </button>
              <p className="font-semibold text-primary-700 dark:text-primary-200">
                Putar audio Part {question.part}
              </p>
            </div>
          )}
          <AudioPlayer ref={audioPlayerRef} key={question.audio} src={`/${question.audio}`} />
          <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
            Audio berisi semua soal Part ini. Jawab sambil mendengarkan.
          </p>
        </div>
      )}

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
                  revealed={revealed}
                  isCorrectAnswer={question.answer === letter}
                  disabled={revealed}
                  onClick={() => !revealed && setSelected(letter)}
                />
              ))}
            </div>

            {revealed && (
              <Card
                className={`relative border-2 ${
                  selected === question.answer
                    ? "border-success-300 bg-success-100 dark:bg-success-600/10"
                    : "border-danger-300 bg-danger-100 dark:bg-danger-600/10"
                }`}
              >
                {isCorrectSelection && existingAnswer && (
                  <motion.span
                    key={`xp-${questionId}`}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                    animate={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: [0, 1, 1, 0], y: [6, -4, -4, -14] }
                    }
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="absolute -top-3 right-4 rounded-full bg-success-500 px-2.5 py-1 text-xs font-bold text-white shadow-md"
                  >
                    +{existingAnswer.xpEarned} XP
                  </motion.span>
                )}
                <p className="font-semibold text-stone-800 dark:text-stone-100">
                  {selected === question.answer ? "Benar!" : "Belum tepat"}
                </p>
                {question.explanation && (
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                    {question.explanation}
                    {question.source && <SourceBadge source={question.source} />}
                  </p>
                )}
                <Mascot mood={mascotMood} message={mascotMessage} size={56} className="mt-3" />
              </Card>
            )}

            <div className="flex justify-end">
              {!revealed ? (
                <Button onClick={handleCheck} disabled={!selected}>
                  Check
                </Button>
              ) : (
                <Button onClick={handleNext}>{isLast ? "Selesai" : "Lanjut"}</Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <Modal
        open={confirmExit}
        title="Keluar dari sesi?"
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
        Progres sesi ini akan hilang kalau kamu keluar sekarang.
      </Modal>

      <Modal
        open={!!pendingLevelUp}
        title="Naik Level!"
        onClose={clearPendingLevelUp}
        footer={<Button onClick={clearPendingLevelUp}>Lanjut</Button>}
      >
        {pendingLevelUp && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot mood="celebrate" size={88} />
            <p>
              Level {pendingLevelUp.fromLevel} ({pendingLevelUp.fromName}) &rarr; Level{" "}
              {pendingLevelUp.toLevel} ({pendingLevelUp.toName})
            </p>
            {pendingLevelUp.freezesGained > 0 && (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Dapat {pendingLevelUp.freezesGained} streak freeze baru!
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

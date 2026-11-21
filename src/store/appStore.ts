import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnswerLetter, Section } from "../types/question";
import { computeAnswerOutcome, freezesGrantedForLevelUp, getLevelInfo, sessionCompletionBonus } from "../lib/xp";
import { evaluateBadges, type BadgeStats } from "../lib/badges";
import type { BadgeId } from "../data/badges";
import { updateSrsEntry, type ReviewSrsEntry } from "../lib/review";
import { getMockSectionDurationSeconds } from "../data/mockConfig";
import { estimateMockScore } from "../lib/mockScore";

export type SessionMode = "practice" | "review";

export interface SessionAnswer {
  questionId: string;
  selected: AnswerLetter | null;
  correctAnswer: AnswerLetter;
  correct: boolean;
  xpEarned: number;
  speedBonus: boolean;
}

export interface CurrentSession {
  id: string;
  section: Section;
  questionIds: string[];
  index: number;
  answers: SessionAnswer[];
  startedAt: number;
  combo: number;
  bestCombo: number;
  xpEarned: number;
  /** Set kalau sesi ini adalah node Learning Path, null kalau latihan bebas. */
  nodeId: string | null;
  mode: SessionMode;
}

export interface LevelUpInfo {
  fromLevel: number;
  toLevel: number;
  fromName: string;
  toName: string;
  freezesGained: number;
}

export interface FinishedSession {
  id: string;
  section: Section;
  questionIds: string[];
  answers: SessionAnswer[];
  startedAt: number;
  finishedAt: number;
  score: number;
  total: number;
  xpEarned: number;
  bestCombo: number;
  levelUp: LevelUpInfo | null;
  dailyGoalJustReached: boolean;
  nodeId: string | null;
  mode: SessionMode;
}

export interface MockSectionState {
  section: Section;
  questionIds: string[];
  /** Jawaban user per questionId, tanpa feedback instan (null = belum dijawab). */
  answers: Record<string, AnswerLetter | null>;
  durationSeconds: number;
  startedAt: number;
  currentIndex: number;
}

export interface MockSession {
  id: string;
  sections: MockSectionState[];
  currentSectionIndex: number;
  startedAt: number;
}

export interface FinishedMockSectionResult {
  section: Section;
  questionIds: string[];
  answers: Record<string, AnswerLetter | null>;
  correct: number;
  total: number;
}

export interface FinishedMockSession {
  id: string;
  startedAt: number;
  finishedAt: number;
  sections: FinishedMockSectionResult[];
  /** Estimasi skala 310-677, bukan skor resmi. */
  estimatedScore: number;
  xpEarned: number;
  levelUp: LevelUpInfo | null;
}

export const DAILY_GOAL_OPTIONS = [10, 20, 30] as const;
const DEFAULT_DAILY_GOAL = 10;
const REVIEW_COMPLETION_BONUS_XP = 15;

interface AppState {
  theme: "light" | "dark";
  currentSession: CurrentSession | null;
  sessionHistory: FinishedSession[];
  xp: number;
  streakFreezes: number;
  currentStreak: number;
  lastStreakDateKey: string | null;
  dailyGoal: number;
  /** Level-up yang terjadi di tengah sesi (lewat jawaban benar), belum ditampilkan ke user. */
  pendingLevelUp: LevelUpInfo | null;
  unlockedBadges: Record<string, number>;
  /** Antrean badge yang baru terbuka, belum ditampilkan sebagai toast. */
  newlyUnlockedBadges: BadgeId[];
  /** Antrean spaced-repetition untuk soal yang pernah salah, keyed by questionId. */
  reviewSrs: Record<string, ReviewSrsEntry>;
  currentMockSession: MockSession | null;
  mockHistory: FinishedMockSession[];
  soundEnabled: boolean;
  toggleTheme: () => void;
  toggleSound: () => void;
  setDailyGoal: (goal: number) => void;
  clearPendingLevelUp: () => void;
  clearNewlyUnlockedBadge: () => void;
  startSession: (
    section: Section,
    questionIds: string[],
    options?: { nodeId?: string | null; mode?: SessionMode }
  ) => void;
  answerCurrent: (
    selected: AnswerLetter,
    correctAnswer: AnswerLetter,
    elapsedSeconds: number
  ) => void;
  goToNext: () => void;
  finishSession: () => FinishedSession | null;
  abandonSession: () => void;
  startMockSession: (sections: { section: Section; questionIds: string[] }[]) => void;
  setMockAnswer: (questionId: string, selected: AnswerLetter | null) => void;
  goToMockQuestion: (index: number) => void;
  advanceMockSection: () => void;
  finishMockSession: (
    getCorrectAnswer: (questionId: string) => AnswerLetter | undefined
  ) => FinishedMockSession | null;
  abandonMockSession: () => void;
}

function toLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateKeyToTimestamp(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m, d).getTime();
}

/** Selisih hari kalender antara dua date key (b - a), mengabaikan jam. */
function daysBetweenDateKeys(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((dateKeyToTimestamp(b) - dateKeyToTimestamp(a)) / MS_PER_DAY);
}

/** Ada jeda >=3 hari kalender antara dua sesi selesai yang berurutan. */
function hasComebackGap(history: FinishedSession[]): boolean {
  for (let i = 1; i < history.length; i++) {
    const prevKey = toLocalDateKey(history[i - 1].finishedAt);
    const curKey = toLocalDateKey(history[i].startedAt);
    if (daysBetweenDateKeys(prevKey, curKey) >= 3) return true;
  }
  return false;
}

function buildBadgeStats(state: {
  xp: number;
  currentStreak: number;
  sessionHistory: FinishedSession[];
  currentSession: CurrentSession | null;
  mockHistory: FinishedMockSession[];
}): BadgeStats {
  const { sessionHistory, currentSession } = state;
  const inProgressCorrect = currentSession
    ? currentSession.answers.filter((a) => a.correct).length
    : 0;
  const totalCorrect =
    sessionHistory.reduce((sum, s) => sum + s.score, 0) + inProgressCorrect;
  const bestComboEver = Math.max(
    currentSession?.bestCombo ?? 0,
    ...sessionHistory.map((s) => s.bestCombo),
    0
  );
  return {
    level: getLevelInfo(state.xp).level,
    currentStreak: state.currentStreak,
    totalCorrect,
    totalSessions: sessionHistory.length,
    bestComboEver,
    perfectSetEver: sessionHistory.some((s) => s.total > 0 && s.score === s.total),
    speedDemonEver: sessionHistory.some(
      (s) =>
        s.total >= 5 &&
        s.answers.filter((a) => a.speedBonus).length / s.total >= 0.8
    ),
    comebackEver: hasComebackGap(sessionHistory),
    pathNodeCompletedEver: sessionHistory.some((s) => !!s.nodeId),
    reviewCompletedEver: sessionHistory.some((s) => s.mode === "review"),
    mockCompletedEver: state.mockHistory.length > 0,
    sectionAccuracy: {
      listening: getSectionProgress(sessionHistory, "listening"),
      reading: getSectionProgress(sessionHistory, "reading"),
      structure: getSectionProgress(sessionHistory, "structure"),
    },
  };
}

type SetFn = (
  partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)
) => void;
type GetFn = () => AppState;

function runBadgeCheck(set: SetFn, get: GetFn): void {
  const state = get();
  const stats = buildBadgeStats(state);
  const newly = evaluateBadges(stats, state.unlockedBadges);
  if (newly.length === 0) return;
  const now = Date.now();
  const unlockedBadges = { ...state.unlockedBadges };
  for (const id of newly) unlockedBadges[id] = now;
  set({
    unlockedBadges,
    newlyUnlockedBadges: [...state.newlyUnlockedBadges, ...newly],
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      currentSession: null,
      sessionHistory: [],
      xp: 0,
      streakFreezes: 0,
      currentStreak: 0,
      lastStreakDateKey: null,
      dailyGoal: DEFAULT_DAILY_GOAL,
      pendingLevelUp: null,
      unlockedBadges: {},
      newlyUnlockedBadges: [],
      reviewSrs: {},
      currentMockSession: null,
      mockHistory: [],
      soundEnabled: false,

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      setDailyGoal: (goal) => set({ dailyGoal: goal }),

      clearPendingLevelUp: () => set({ pendingLevelUp: null }),

      clearNewlyUnlockedBadge: () =>
        set((state) => ({ newlyUnlockedBadges: state.newlyUnlockedBadges.slice(1) })),

      startSession: (section, questionIds, options) =>
        set({
          currentSession: {
            id: crypto.randomUUID(),
            section,
            questionIds,
            index: 0,
            answers: [],
            startedAt: Date.now(),
            combo: 0,
            bestCombo: 0,
            xpEarned: 0,
            nodeId: options?.nodeId ?? null,
            mode: options?.mode ?? "practice",
          },
        }),

      answerCurrent: (selected, correctAnswer, elapsedSeconds) => {
        set((state) => {
          const session = state.currentSession;
          if (!session) return state;
          const questionId = session.questionIds[session.index];
          const correct = selected === correctAnswer;
          const outcome = computeAnswerOutcome(correct, elapsedSeconds, session.combo);

          const answer: SessionAnswer = {
            questionId,
            selected,
            correctAnswer,
            correct,
            xpEarned: outcome.xpEarned,
            speedBonus: outcome.speedBonus,
          };
          const answers = session.answers.filter((a) => a.questionId !== questionId);
          answers.push(answer);

          const xpBefore = state.xp;
          const xpAfter = xpBefore + outcome.xpEarned;
          const levelBefore = getLevelInfo(xpBefore);
          const levelAfter = getLevelInfo(xpAfter);
          const leveledUp = levelAfter.level > levelBefore.level;
          const freezesGained = leveledUp
            ? freezesGrantedForLevelUp(levelBefore.level, levelAfter.level)
            : 0;

          const updatedSrsEntry = updateSrsEntry(state.reviewSrs[questionId], correct, Date.now());
          const reviewSrs = { ...state.reviewSrs };
          if (updatedSrsEntry) reviewSrs[questionId] = updatedSrsEntry;

          return {
            currentSession: {
              ...session,
              answers,
              combo: outcome.newCombo,
              bestCombo: Math.max(session.bestCombo, outcome.newCombo),
              xpEarned: session.xpEarned + outcome.xpEarned,
            },
            xp: xpAfter,
            streakFreezes: state.streakFreezes + freezesGained,
            reviewSrs,
            pendingLevelUp: leveledUp
              ? {
                  fromLevel: levelBefore.level,
                  toLevel: levelAfter.level,
                  fromName: levelBefore.name,
                  toName: levelAfter.name,
                  freezesGained,
                }
              : state.pendingLevelUp,
          };
        });
        runBadgeCheck(set, get);
      },

      goToNext: () =>
        set((state) => {
          const session = state.currentSession;
          if (!session) return state;
          return { currentSession: { ...session, index: session.index + 1 } };
        }),

      finishSession: () => {
        const state = get();
        const session = state.currentSession;
        if (!session) return null;

        const score = session.answers.filter((a) => a.correct).length;
        const total = session.questionIds.length;
        const bonusXp =
          sessionCompletionBonus(score, total) + (session.mode === "review" ? REVIEW_COMPLETION_BONUS_XP : 0);

        const xpBefore = state.xp;
        const xpAfter = xpBefore + bonusXp;
        const levelBefore = getLevelInfo(xpBefore);
        const levelAfter = getLevelInfo(xpAfter);
        const leveledUp = levelAfter.level > levelBefore.level;
        const freezesGained = leveledUp
          ? freezesGrantedForLevelUp(levelBefore.level, levelAfter.level)
          : 0;

        const finishedAt = Date.now();
        const todayKey = toLocalDateKey(finishedAt);
        const todayCountBefore = state.sessionHistory
          .filter((s) => toLocalDateKey(s.finishedAt) === todayKey)
          .reduce((sum, s) => sum + s.total, 0);
        const todayCountAfter = todayCountBefore + total;

        let currentStreak = state.currentStreak;
        let streakFreezes = state.streakFreezes + freezesGained;
        let lastStreakDateKey = state.lastStreakDateKey;
        let dailyGoalJustReached = false;

        if (todayCountAfter >= state.dailyGoal && lastStreakDateKey !== todayKey) {
          dailyGoalJustReached = true;
          if (lastStreakDateKey === null) {
            currentStreak = 1;
          } else {
            const missedDays = daysBetweenDateKeys(lastStreakDateKey, todayKey) - 1;
            if (missedDays <= 0) {
              currentStreak += 1;
            } else if (missedDays <= streakFreezes) {
              streakFreezes -= missedDays;
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
          }
          lastStreakDateKey = todayKey;
        }

        const finished: FinishedSession = {
          id: session.id,
          section: session.section,
          questionIds: session.questionIds,
          answers: session.answers,
          startedAt: session.startedAt,
          finishedAt,
          score,
          total,
          xpEarned: session.xpEarned + bonusXp,
          bestCombo: session.bestCombo,
          levelUp: leveledUp
            ? {
                fromLevel: levelBefore.level,
                toLevel: levelAfter.level,
                fromName: levelBefore.name,
                toName: levelAfter.name,
                freezesGained,
              }
            : null,
          dailyGoalJustReached,
          nodeId: session.nodeId,
          mode: session.mode,
        };

        set({
          currentSession: null,
          sessionHistory: [...state.sessionHistory, finished],
          xp: xpAfter,
          streakFreezes,
          currentStreak,
          lastStreakDateKey,
        });
        runBadgeCheck(set, get);
        return finished;
      },

      abandonSession: () => set({ currentSession: null }),

      startMockSession: (sections) =>
        set({
          currentMockSession: {
            id: crypto.randomUUID(),
            startedAt: Date.now(),
            currentSectionIndex: 0,
            sections: sections.map((s, i) => ({
              section: s.section,
              questionIds: s.questionIds,
              answers: {},
              durationSeconds: getMockSectionDurationSeconds(s.section, s.questionIds.length),
              startedAt: i === 0 ? Date.now() : 0,
              currentIndex: 0,
            })),
          },
        }),

      setMockAnswer: (questionId, selected) =>
        set((state) => {
          const session = state.currentMockSession;
          if (!session) return state;
          const sections = session.sections.map((sec, i) =>
            i === session.currentSectionIndex
              ? { ...sec, answers: { ...sec.answers, [questionId]: selected } }
              : sec
          );
          return { currentMockSession: { ...session, sections } };
        }),

      goToMockQuestion: (index) =>
        set((state) => {
          const session = state.currentMockSession;
          if (!session) return state;
          const sections = session.sections.map((sec, i) =>
            i === session.currentSectionIndex ? { ...sec, currentIndex: index } : sec
          );
          return { currentMockSession: { ...session, sections } };
        }),

      advanceMockSection: () =>
        set((state) => {
          const session = state.currentMockSession;
          if (!session) return state;
          const nextIndex = session.currentSectionIndex + 1;
          if (nextIndex >= session.sections.length) return state;
          const sections = session.sections.map((sec, i) =>
            i === nextIndex ? { ...sec, startedAt: Date.now() } : sec
          );
          return { currentMockSession: { ...session, sections, currentSectionIndex: nextIndex } };
        }),

      finishMockSession: (getCorrectAnswer) => {
        const state = get();
        const session = state.currentMockSession;
        if (!session) return null;

        const finishedAt = Date.now();
        const sectionResults: FinishedMockSectionResult[] = session.sections.map((sec) => {
          let correct = 0;
          for (const questionId of sec.questionIds) {
            const selected = sec.answers[questionId];
            if (selected && selected === getCorrectAnswer(questionId)) correct += 1;
          }
          return {
            section: sec.section,
            questionIds: sec.questionIds,
            answers: sec.answers,
            correct,
            total: sec.questionIds.length,
          };
        });

        const totalCorrect = sectionResults.reduce((sum, r) => sum + r.correct, 0);
        const totalQuestions = sectionResults.reduce((sum, r) => sum + r.total, 0);
        const bonusXp = sessionCompletionBonus(totalCorrect, totalQuestions) * 2;
        const estimatedScore = estimateMockScore(
          sectionResults.map((r) => ({ section: r.section, correct: r.correct, total: r.total }))
        );

        const xpBefore = state.xp;
        const xpAfter = xpBefore + bonusXp;
        const levelBefore = getLevelInfo(xpBefore);
        const levelAfter = getLevelInfo(xpAfter);
        const leveledUp = levelAfter.level > levelBefore.level;
        const freezesGained = leveledUp
          ? freezesGrantedForLevelUp(levelBefore.level, levelAfter.level)
          : 0;

        const finished: FinishedMockSession = {
          id: session.id,
          startedAt: session.startedAt,
          finishedAt,
          sections: sectionResults,
          estimatedScore,
          xpEarned: bonusXp,
          levelUp: leveledUp
            ? {
                fromLevel: levelBefore.level,
                toLevel: levelAfter.level,
                fromName: levelBefore.name,
                toName: levelAfter.name,
                freezesGained,
              }
            : null,
        };

        set({
          currentMockSession: null,
          mockHistory: [...state.mockHistory, finished],
          xp: xpAfter,
          streakFreezes: state.streakFreezes + freezesGained,
          pendingLevelUp: leveledUp
            ? {
                fromLevel: levelBefore.level,
                toLevel: levelAfter.level,
                fromName: levelBefore.name,
                toName: levelAfter.name,
                freezesGained,
              }
            : state.pendingLevelUp,
        });
        runBadgeCheck(set, get);
        return finished;
      },

      abandonMockSession: () => set({ currentMockSession: null }),
    }),
    {
      name: "toefl-quest-store",
      version: 2,
      partialize: (state) => ({
        theme: state.theme,
        currentSession: state.currentSession,
        sessionHistory: state.sessionHistory,
        xp: state.xp,
        streakFreezes: state.streakFreezes,
        currentStreak: state.currentStreak,
        lastStreakDateKey: state.lastStreakDateKey,
        dailyGoal: state.dailyGoal,
        unlockedBadges: state.unlockedBadges,
        newlyUnlockedBadges: state.newlyUnlockedBadges,
        reviewSrs: state.reviewSrs,
        currentMockSession: state.currentMockSession,
        mockHistory: state.mockHistory,
        soundEnabled: state.soundEnabled,
      }),
      // Migrasi aman: data lama (sebelum Fase 5A/5B) tidak punya field gamification baru.
      // Isi default supaya tidak undefined, dan lengkapi sesi lama kalau ada yang menggantung.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<AppState> & {
          currentSession?: (Partial<CurrentSession> & { answers?: Partial<SessionAnswer>[] }) | null;
          sessionHistory?: (Partial<FinishedSession> & { answers?: Partial<SessionAnswer>[] })[];
        };

        function fillAnswer(a: Partial<SessionAnswer>): SessionAnswer {
          return {
            questionId: a.questionId ?? "",
            selected: a.selected ?? null,
            correctAnswer: a.correctAnswer ?? "A",
            correct: a.correct ?? false,
            xpEarned: a.xpEarned ?? 0,
            speedBonus: a.speedBonus ?? false,
          };
        }

        const currentSession = p.currentSession
          ? {
              ...p.currentSession,
              combo: p.currentSession.combo ?? 0,
              bestCombo: p.currentSession.bestCombo ?? 0,
              xpEarned: p.currentSession.xpEarned ?? 0,
              nodeId: p.currentSession.nodeId ?? null,
              mode: p.currentSession.mode ?? "practice",
              answers: (p.currentSession.answers ?? []).map(fillAnswer),
            }
          : null;

        const sessionHistory = (p.sessionHistory ?? []).map((s) => ({
          ...s,
          nodeId: s.nodeId ?? null,
          mode: s.mode ?? "practice",
          answers: (s.answers ?? []).map(fillAnswer),
        }));

        return {
          theme: p.theme ?? "light",
          currentSession,
          sessionHistory,
          xp: p.xp ?? 0,
          streakFreezes: p.streakFreezes ?? 0,
          currentStreak: p.currentStreak ?? 0,
          lastStreakDateKey: p.lastStreakDateKey ?? null,
          dailyGoal: p.dailyGoal ?? DEFAULT_DAILY_GOAL,
          unlockedBadges: p.unlockedBadges ?? {},
          newlyUnlockedBadges: p.newlyUnlockedBadges ?? [],
          reviewSrs: p.reviewSrs ?? {},
          currentMockSession: p.currentMockSession ?? null,
          mockHistory: p.mockHistory ?? [],
          soundEnabled: p.soundEnabled ?? false,
        };
      },
    }
  )
);

export function findSession(
  history: FinishedSession[],
  id: string
): FinishedSession | undefined {
  return history.find((s) => s.id === id);
}

export function findMockSession(
  history: FinishedMockSession[],
  id: string
): FinishedMockSession | undefined {
  return history.find((s) => s.id === id);
}

export function getSectionProgress(
  history: FinishedSession[],
  section: Section
): { attempted: number; correct: number } {
  let attempted = 0;
  let correct = 0;
  for (const session of history) {
    if (session.section !== section || session.mode === "review") continue;
    attempted += session.total;
    correct += session.score;
  }
  return { attempted, correct };
}

export function getTodayCount(history: FinishedSession[]): number {
  const todayKey = toLocalDateKey(Date.now());
  return history
    .filter((s) => toLocalDateKey(s.finishedAt) === todayKey)
    .reduce((sum, s) => sum + s.total, 0);
}

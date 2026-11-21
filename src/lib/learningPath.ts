import type { FinishedSession } from "../store/appStore";
import type { Question, Section } from "../types/question";

export type NodeStatus = "locked" | "active" | "done";

export interface PathNode {
  id: string;
  section: Section;
  order: number;
  questionIds: string[];
  status: NodeStatus;
  stars: number;
  bestPercent: number | null;
}

const NODE_SIZE = 10;
const MIN_TAIL_SIZE = 5;

export function starsForPercent(percent: number): number {
  if (percent >= 90) return 3;
  if (percent >= 70) return 2;
  return 1;
}

/** Bagi soal "ok" satu section jadi node 10 soal; sisa <5 digabung ke node sebelumnya. */
export function buildSectionNodes(
  section: Section,
  sectionQuestions: Question[],
  history: FinishedSession[]
): PathNode[] {
  const ids = sectionQuestions.map((q) => q.id);
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += NODE_SIZE) {
    chunks.push(ids.slice(i, i + NODE_SIZE));
  }
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.length < MIN_TAIL_SIZE) {
      chunks[chunks.length - 2] = [...chunks[chunks.length - 2], ...last];
      chunks.pop();
    }
  }

  let previousDone = true;
  return chunks.map((questionIds, i) => {
    const id = `${section}-node-${i + 1}`;
    const attempts = history.filter((s) => s.nodeId === id);
    const bestPercent =
      attempts.length > 0
        ? Math.max(...attempts.map((s) => (s.total > 0 ? (s.score / s.total) * 100 : 0)))
        : null;
    const done = bestPercent !== null;
    const status: NodeStatus = done ? "done" : previousDone ? "active" : "locked";
    previousDone = done;
    return {
      id,
      section,
      order: i + 1,
      questionIds,
      status,
      stars: bestPercent === null ? 0 : starsForPercent(bestPercent),
      bestPercent,
    };
  });
}

export function buildAllNodes(
  allQuestions: Question[],
  history: FinishedSession[]
): Record<Section, PathNode[]> {
  const sections: Section[] = ["listening", "structure", "reading"];
  const result = {} as Record<Section, PathNode[]>;
  for (const section of sections) {
    const sectionQuestions = allQuestions.filter((q) => q.section === section);
    result[section] = buildSectionNodes(section, sectionQuestions, history);
  }
  return result;
}

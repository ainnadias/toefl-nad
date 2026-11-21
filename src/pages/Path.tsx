import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Check, Headphones, Lock, PenLine, Star } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import { loadQuestions } from "../lib/loadQuestions";
import { buildAllNodes, type PathNode } from "../lib/learningPath";
import { useAppStore } from "../store/appStore";
import type { Question, Section } from "../types/question";

const SECTION_META: Record<Section, { label: string; icon: typeof Headphones }> = {
  listening: { label: "Listening", icon: Headphones },
  structure: { label: "Structure & Written Expression", icon: PenLine },
  reading: { label: "Reading Comprehension", icon: BookOpen },
};

function NodeCard({
  node,
  onStart,
}: {
  node: PathNode;
  onStart: (node: PathNode) => void;
}) {
  const locked = node.status === "locked";
  const done = node.status === "done";

  return (
    <Card
      className={`flex min-w-[9.5rem] flex-col items-center gap-2 p-4 text-center ${
        locked ? "opacity-50" : ""
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
          done
            ? "bg-success-100 text-success-600 dark:bg-stone-700 dark:text-success-300"
            : locked
              ? "bg-stone-200 text-stone-400 dark:bg-stone-700 dark:text-stone-500"
              : "bg-primary-100 text-primary-600 dark:bg-stone-700 dark:text-primary-300"
        }`}
      >
        {locked ? <Lock className="h-5 w-5" aria-hidden /> : done ? <Check className="h-5 w-5" aria-hidden /> : node.order}
      </div>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
        Node {node.order}
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {node.questionIds.length} soal
      </p>
      {done && (
        <div className="flex gap-0.5">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`h-4 w-4 ${
                n <= node.stars
                  ? "fill-accent-500 text-accent-500"
                  : "fill-transparent text-stone-300 dark:text-stone-600"
              }`}
              aria-hidden
            />
          ))}
        </div>
      )}
      <Button
        variant={done ? "secondary" : "primary"}
        className="mt-1 px-4 py-1.5 text-sm"
        disabled={locked}
        onClick={() => onStart(node)}
      >
        {done ? "Ulangi" : "Mulai"}
      </Button>
    </Card>
  );
}

export default function Path() {
  const navigate = useNavigate();
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const startSession = useAppStore((s) => s.startSession);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    loadQuestions().then(setQuestions);
  }, []);

  const nodesBySection = useMemo(() => {
    if (!questions) return null;
    return buildAllNodes(questions, sessionHistory);
  }, [questions, sessionHistory]);

  function handleStart(node: PathNode) {
    startSession(node.section, node.questionIds, { nodeId: node.id, mode: "practice" });
    navigate(`/practice/${node.section}`);
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Learning Path</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Selesaikan node satu per satu, dapatkan bintang dari skormu.
        </p>
      </div>

      {!nodesBySection && <p className="text-stone-500">Memuat peta...</p>}

      {nodesBySection &&
        (Object.keys(nodesBySection) as Section[]).map((section) => {
          const nodes = nodesBySection[section];
          if (nodes.length === 0) return null;
          const { label, icon: Icon } = SECTION_META[section];
          return (
            <div key={section}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary-500" aria-hidden />
                <h2 className="font-semibold text-stone-800 dark:text-stone-100">{label}</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {nodes.map((node) => (
                  <NodeCard key={node.id} node={node} onStart={handleStart} />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

import { motion, useReducedMotion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm font-medium text-stone-500 dark:text-stone-400">
        <span>
          Soal {Math.min(current + 1, total)} dari {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <motion.div
          className="h-full rounded-full bg-primary-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

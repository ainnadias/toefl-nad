import { motion, useReducedMotion } from "framer-motion";
import { getLevelInfo } from "../lib/xp";

interface XpBarProps {
  xp: number;
  compact?: boolean;
  className?: string;
}

export default function XpBar({ xp, compact = false, className = "" }: XpBarProps) {
  const reduceMotion = useReducedMotion();
  const info = getLevelInfo(xp);
  const levelSpan = info.nextLevelXp !== null ? info.nextLevelXp - info.levelStartXp : 0;
  const percent = info.isMaxLevel ? 100 : Math.min(100, Math.round((info.xpIntoLevel / levelSpan) * 100));

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="whitespace-nowrap rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-stone-700 dark:text-primary-200">
          Lv.{info.level}
        </span>
        <div className="h-2 w-16 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700 sm:w-24">
          <motion.div
            className="h-full rounded-full bg-primary-500"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-stone-800 dark:text-stone-100">
          Lv.{info.level} &middot; {info.name}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {info.isMaxLevel
            ? `${info.xp} XP (MAX)`
            : `${info.xpIntoLevel}/${levelSpan} XP`}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <motion.div
          className="h-full rounded-full bg-primary-500"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

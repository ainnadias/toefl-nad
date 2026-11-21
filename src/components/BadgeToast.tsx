import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BADGES } from "../data/badges";
import type { BadgeId } from "../data/badges";
import { getBadgeIcon } from "../lib/badgeIcons";
import { playBadgeSound } from "../lib/sound";

interface BadgeToastProps {
  badgeId: BadgeId | null;
  onDismiss: () => void;
}

export default function BadgeToast({ badgeId, onDismiss }: BadgeToastProps) {
  const badge = badgeId ? BADGES.find((b) => b.id === badgeId) : null;
  const Icon = getBadgeIcon(badge?.icon ?? "");

  useEffect(() => {
    if (badge) playBadgeSound();
  }, [badge]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.button
          type="button"
          onClick={onDismiss}
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed left-1/2 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-xl shadow-stone-900/10 dark:bg-stone-800"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-stone-700 dark:text-accent-300">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-300">
              Badge terbuka!
            </p>
            <p className="font-bold text-stone-800 dark:text-stone-100">{badge.name}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{badge.description}</p>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

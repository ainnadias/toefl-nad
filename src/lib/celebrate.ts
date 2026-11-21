import confetti from "canvas-confetti";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Momen besar: naik level. */
export function celebrateLevelUp(): void {
  if (prefersReducedMotion()) return;
  confetti({ particleCount: 110, spread: 80, startVelocity: 45, origin: { y: 0.6 } });
  setTimeout(() => {
    confetti({ particleCount: 60, spread: 100, scalar: 0.8, origin: { y: 0.5 } });
  }, 200);
}

/** Target harian tercapai untuk pertama kali hari itu. */
export function celebrateDailyGoal(): void {
  if (prefersReducedMotion()) return;
  confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
}

/** Skor sempurna di satu sesi latihan. */
export function celebratePerfectScore(): void {
  if (prefersReducedMotion()) return;
  confetti({ particleCount: 140, spread: 100, startVelocity: 55, origin: { y: 0.6 } });
}

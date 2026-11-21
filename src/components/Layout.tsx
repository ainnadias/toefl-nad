import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { Map, Moon, Sun, UserRound, Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled } from "../lib/sound";
import { useAppStore } from "../store/appStore";
import BadgeToast from "./BadgeToast";
import XpBar from "./XpBar";

export default function Layout() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const xp = useAppStore((s) => s.xp);
  const newlyUnlockedBadges = useAppStore((s) => s.newlyUnlockedBadges);
  const clearNewlyUnlockedBadge = useAppStore((s) => s.clearNewlyUnlockedBadge);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-stone-900">
      <BadgeToast badgeId={newlyUnlockedBadges[0] ?? null} onDismiss={clearNewlyUnlockedBadge} />
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="shrink-0 text-lg font-bold text-primary-600 dark:text-primary-300"
        >
          TOEFL Quest
        </Link>
        <XpBar xp={xp} compact className="min-w-0" />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/path"
            aria-label="Learning Path"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-primary-600 dark:bg-stone-800 dark:text-stone-300"
          >
            <Map className="h-5 w-5" />
          </Link>
          <Link
            to="/profile"
            aria-label="Profil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-primary-600 dark:bg-stone-800 dark:text-stone-300"
          >
            <UserRound className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "Matikan efek suara" : "Nyalakan efek suara"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-primary-600 dark:bg-stone-800 dark:text-stone-300"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Ganti tema terang/gelap"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-primary-600 dark:bg-stone-800 dark:text-stone-300"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

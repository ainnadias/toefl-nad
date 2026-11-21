import { motion, useReducedMotion } from "framer-motion";

export type MascotMood = "normal" | "happy" | "encourage" | "celebrate";

interface MascotProps {
  mood: MascotMood;
  message?: string;
  size?: number;
  className?: string;
}

const BODY_FILL = "#fb923c";
const BODY_FILL_DARK = "#f97316";
const INK = "#44403c";
const BLUSH = "#fda4af";

const HAPPY_MESSAGES = [
  "Mantap, benar!",
  "Keren, lanjutkan!",
  "Nice, otakmu lagi panas!",
  "Betul! TOEFL takluk sama kamu.",
  "Yes! Satu lagi soal jatuh.",
];

const ENCOURAGE_MESSAGES = [
  "Belum tepat, gapapa. Lanjut lagi!",
  "Santai, ini bagian dari belajar.",
  "Dekat kok, coba lagi di soal lain!",
  "Salah satu soal doang, jangan nyerah.",
  "Yuk pelan-pelan, kamu pasti bisa.",
];

const CELEBRATE_MESSAGES = [
  "Level up! Kamu makin jago!",
  "Naik level nih, keren banget!",
  "Progres kamu nyata, teruskan!",
];

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomHappyMessage(): string {
  return pickRandom(HAPPY_MESSAGES);
}

export function randomEncourageMessage(): string {
  return pickRandom(ENCOURAGE_MESSAGES);
}

export function randomCelebrateMessage(): string {
  return pickRandom(CELEBRATE_MESSAGES);
}

function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "happy":
      return (
        <>
          <circle cx="44" cy="58" r="5" fill={INK} />
          <circle cx="76" cy="58" r="5" fill={INK} />
          <circle cx="34" cy="70" r="6" fill={BLUSH} opacity={0.8} />
          <circle cx="86" cy="70" r="6" fill={BLUSH} opacity={0.8} />
          <path
            d="M42 72 Q60 92 78 72"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case "celebrate":
      return (
        <>
          <path d="M39 54 L49 62" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M49 54 L39 62" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M71 54 L81 62" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M81 54 L71 62" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <circle cx="34" cy="70" r="6" fill={BLUSH} opacity={0.8} />
          <circle cx="86" cy="70" r="6" fill={BLUSH} opacity={0.8} />
          <ellipse cx="60" cy="76" rx="12" ry="10" fill={INK} />
        </>
      );
    case "encourage":
      return (
        <>
          <circle cx="44" cy="58" r="5" fill={INK} />
          <path
            d="M70 58 Q76 54 82 58"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M46 76 Q60 70 74 76"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    default:
      return (
        <>
          <circle cx="44" cy="58" r="5" fill={INK} />
          <circle cx="76" cy="58" r="5" fill={INK} />
          <path
            d="M46 76 L74 76"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
  }
}

export default function Mascot({ mood, message, size = 72, className = "" }: MascotProps) {
  const reduceMotion = useReducedMotion();
  const armsUp = mood === "celebrate" || mood === "happy";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="shrink-0"
        animate={
          reduceMotion
            ? undefined
            : mood === "celebrate"
              ? { y: [0, -8, 0], rotate: [0, -4, 4, 0] }
              : mood === "happy"
                ? { y: [0, -5, 0] }
                : { y: 0, rotate: 0 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <ellipse cx="60" cy="108" rx="26" ry="5" fill="#000" opacity={0.08} />
        <motion.g
          animate={!reduceMotion && armsUp ? { rotate: -35 } : { rotate: 10 }}
          style={{ originX: "22px", originY: "70px" }}
          transition={{ duration: 0.3 }}
        >
          <rect x="10" y="64" width="24" height="12" rx="6" fill={BODY_FILL} />
        </motion.g>
        <motion.g
          animate={!reduceMotion && armsUp ? { rotate: 35 } : { rotate: -10 }}
          style={{ originX: "98px", originY: "70px" }}
          transition={{ duration: 0.3 }}
        >
          <rect x="86" y="64" width="24" height="12" rx="6" fill={BODY_FILL} />
        </motion.g>
        <circle cx="60" cy="62" r="44" fill={BODY_FILL} stroke={BODY_FILL_DARK} strokeWidth={2} />
        <Face mood={mood} />
      </motion.svg>
      {message && (
        <motion.div
          key={message}
          initial={reduceMotion ? undefined : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm dark:bg-stone-800 dark:text-stone-200"
        >
          {message}
        </motion.div>
      )}
    </div>
  );
}

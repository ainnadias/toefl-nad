import { useState } from "react";
import type { InfoSource } from "../types/question";

interface SourceBadgeProps {
  source: InfoSource;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="Lihat sumber materi"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-100 text-[10px] font-bold leading-none text-accent-600 hover:bg-accent-300/60 dark:bg-stone-700 dark:text-accent-300"
      >
        (!)
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-xl bg-white px-3 py-2 text-xs leading-snug text-stone-600 shadow-lg shadow-stone-900/10 dark:bg-stone-800 dark:text-stone-300"
        >
          Sumber: {source.file}
          {source.page !== null && `, hlm. ${source.page}`}
          {!source.verified && " (belum diverifikasi)"}
        </span>
      )}
    </span>
  );
}

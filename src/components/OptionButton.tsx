import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { AnswerLetter } from "../types/question";

interface OptionButtonProps {
  letter: AnswerLetter;
  text: string;
  selected: boolean;
  revealed: boolean;
  isCorrectAnswer: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function OptionButton({
  letter,
  text,
  selected,
  revealed,
  isCorrectAnswer,
  disabled,
  onClick,
}: OptionButtonProps) {
  const reduceMotion = useReducedMotion();

  let stateClasses =
    "border-stone-200 bg-white hover:border-primary-300 dark:border-stone-700 dark:bg-stone-800";
  if (!revealed && selected) {
    stateClasses = "border-primary-500 bg-primary-50 dark:bg-stone-700";
  }
  if (revealed && isCorrectAnswer) {
    stateClasses = "border-success-500 bg-success-100 dark:bg-success-600/20";
  }
  if (revealed && selected && !isCorrectAnswer) {
    stateClasses = "border-danger-500 bg-danger-100 dark:bg-danger-600/20";
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.98 }}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-base transition-colors disabled:cursor-not-allowed ${stateClasses}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-500 dark:bg-stone-700 dark:text-stone-300">
        {letter}
      </span>
      <span className="flex-1 text-stone-800 dark:text-stone-100">{text}</span>
      {revealed && isCorrectAnswer && (
        <Check className="h-5 w-5 shrink-0 text-success-600" aria-hidden />
      )}
      {revealed && selected && !isCorrectAnswer && (
        <X className="h-5 w-5 shrink-0 text-danger-600" aria-hidden />
      )}
    </motion.button>
  );
}

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  "aria-label"?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary-500 text-white shadow-md shadow-primary-500/30 hover:bg-primary-600 disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none dark:disabled:bg-stone-700 dark:disabled:text-stone-500",
  secondary:
    "bg-white text-primary-700 border-2 border-primary-200 hover:border-primary-400 dark:bg-stone-800 dark:text-primary-200 dark:border-stone-600 dark:hover:border-primary-400",
  ghost:
    "bg-transparent text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
  danger:
    "bg-danger-500 text-white shadow-md shadow-danger-500/30 hover:bg-danger-600",
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

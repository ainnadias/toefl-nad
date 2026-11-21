import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-white p-6 shadow-sm shadow-stone-200/60 dark:bg-stone-800 dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

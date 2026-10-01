import type { HTMLAttributes } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-cinza/15 bg-white p-4 shadow-sm dark:border-papel/10 dark:bg-noite-clara ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

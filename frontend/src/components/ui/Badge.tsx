import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-nevoa text-tinta dark:bg-noite-borda dark:text-papel",
  success: "bg-receita/15 text-receita dark:bg-receita/20",
  warning: "bg-luz-escura/15 text-luz-escura dark:bg-luz-escura/20",
  danger: "bg-despesa/15 text-despesa dark:bg-despesa/20",
  info: "bg-petroleo/10 text-petroleo dark:bg-petroleo/25 dark:text-nevoa",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

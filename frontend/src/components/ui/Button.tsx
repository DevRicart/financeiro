import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-petroleo text-white hover:bg-petroleo-escuro",
  secondary: "bg-nevoa text-tinta hover:bg-nevoa/70 dark:bg-noite-borda dark:text-papel dark:hover:bg-noite-borda/70",
  danger: "bg-despesa text-white hover:bg-despesa/85",
  ghost: "bg-transparent text-cinza hover:bg-nevoa dark:text-papel/80 dark:hover:bg-noite-borda",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

export function Button({ variant = "primary", isLoading, className = "", children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "..." : children}
    </button>
  );
}

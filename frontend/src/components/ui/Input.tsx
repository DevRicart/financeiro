import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Adds a show/hide toggle inside the field. Only meaningful with type="password". */
  revealable?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, revealable, type, ...props }, ref) => {
    const [revealed, setRevealed] = useState(false);
    const inputId = id ?? props.name;
    const isPasswordToggle = revealable && type === "password";

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-tinta dark:text-papel">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPasswordToggle && revealed ? "text" : type}
            className={`w-full rounded-lg border border-cinza/30 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo dark:border-papel/15 dark:bg-noite-clara dark:text-papel ${
              isPasswordToggle ? "pr-10" : ""
            } ${className}`}
            {...props}
          />
          {isPasswordToggle && (
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              tabIndex={-1}
              aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-cinza hover:text-tinta dark:text-papel/60 dark:hover:text-papel"
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-despesa">{error}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

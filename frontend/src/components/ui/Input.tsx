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
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPasswordToggle && revealed ? "text" : type}
            className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
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
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-tinta dark:text-papel">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`rounded-lg border border-cinza/30 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo dark:border-papel/15 dark:bg-noite-clara dark:text-papel ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-despesa">{error}</span>}
      </div>
    );
  },
);
Select.displayName = "Select";

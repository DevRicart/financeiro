import { forwardRef, type ChangeEvent, type ComponentPropsWithoutRef } from "react";
import { sanitizeCurrencyInput } from "../../utils/currency";
import { Input } from "./Input";

interface CurrencyInputProps extends Omit<ComponentPropsWithoutRef<typeof Input>, "type" | "inputMode"> {
  /** Lets a leading minus through, for fields that can hold a negative amount. */
  allowNegative?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ onChange, allowNegative = false, ...props }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const sanitized = sanitizeCurrencyInput(input.value, { allowNegative });

      if (sanitized !== input.value) {
        const caret = (input.selectionStart ?? input.value.length) + (sanitized.length - input.value.length);
        input.value = sanitized;
        input.setSelectionRange(caret, caret);
      }

      onChange?.(event);
    };

    return <Input ref={ref} inputMode="decimal" autoComplete="off" placeholder="0,00" {...props} onChange={handleChange} />;
  },
);
CurrencyInput.displayName = "CurrencyInput";

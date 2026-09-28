import { z } from "zod";
import { parseCurrencyInput } from "../utils/currency";

export const accountSchema = z.object({
  name: z.string().min(1, "Informe um nome"),
  institution: z.string().optional(),
  account_type: z.enum(["CHECKING", "SAVINGS", "WALLET", "DIGITAL", "INVESTMENT", "CASH"]),
  initial_balance: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(parseCurrencyInput(value))), "Valor inválido"),
});
export type AccountFormData = z.infer<typeof accountSchema>;

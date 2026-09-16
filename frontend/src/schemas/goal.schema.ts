import { z } from "zod";
import { parseCurrencyInput } from "../utils/currency";

export const goalSchema = z.object({
  name: z.string().min(1, "Informe um nome"),
  description: z.string().optional(),
  goal_type: z.enum(["INDIVIDUAL", "SHARED"]),
  target_amount: z
    .string()
    .min(1, "Informe o valor alvo")
    .refine((value) => Number(parseCurrencyInput(value)) > 0, "Valor deve ser maior que zero"),
  deadline: z.string().optional(),
});
export type GoalFormData = z.infer<typeof goalSchema>;

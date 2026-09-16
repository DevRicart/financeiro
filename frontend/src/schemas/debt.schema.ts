import { z } from "zod";
import { parseCurrencyInput } from "../utils/currency";

export const debtSchema = z
  .object({
    client: z.coerce.number().optional(),
    person_name: z.string().optional(),
    reason: z.string().min(1, "Informe o motivo"),
    direction: z.enum(["RECEIVABLE", "PAYABLE"]),
    total_amount: z
      .string()
      .min(1, "Informe o valor")
      .refine((value) => Number(parseCurrencyInput(value)) > 0, "Valor deve ser maior que zero"),
    due_date: z.string().optional(),
  })
  .refine((data) => Boolean(data.client) || Boolean(data.person_name?.trim()), {
    message: "Selecione um cliente ou informe um nome",
    path: ["person_name"],
  });
export type DebtFormData = z.infer<typeof debtSchema>;

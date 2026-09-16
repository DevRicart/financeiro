import { z } from "zod";

export const debtSchema = z.object({
  person_name: z.string().min(1, "Informe o nome da pessoa"),
  reason: z.string().min(1, "Informe o motivo"),
  direction: z.enum(["RECEIVABLE", "PAYABLE"]),
  total_amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Valor deve ser maior que zero"),
  due_date: z.string().optional(),
});
export type DebtFormData = z.infer<typeof debtSchema>;

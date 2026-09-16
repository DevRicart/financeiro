import { z } from "zod";

export const transactionSchema = z.object({
  transaction_type: z.enum(["INCOME", "EXPENSE"]),
  category: z.coerce.number().positive("Escolha uma categoria"),
  title: z.string().min(1, "Informe uma descrição"),
  description: z.string().optional(),
  total_amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Valor deve ser maior que zero"),
  competence_date: z.string().min(1, "Informe a data"),
  due_date: z.string().optional(),
  is_shared: z.boolean().optional(),
});
export type TransactionFormData = z.infer<typeof transactionSchema>;

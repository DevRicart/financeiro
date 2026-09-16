import { z } from "zod";
import { parseCurrencyInput } from "../utils/currency";

export const transactionSchema = z.object({
  transaction_type: z.enum(["INCOME", "EXPENSE"]),
  category: z.coerce.number().positive("Escolha uma categoria"),
  title: z.string().min(1, "Informe uma descrição"),
  description: z.string().optional(),
  total_amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((value) => Number(parseCurrencyInput(value)) > 0, "Valor deve ser maior que zero"),
  competence_date: z.string().min(1, "Informe a data"),
  due_date: z.string().optional(),
  is_shared: z.boolean().optional(),

  income_type: z.string().optional(),
  credit_card: z.coerce.number().optional(),

  salary_employer_name: z.string().optional(),
  salary_net_amount: z.string().optional(),
  salary_reference_month: z.string().optional(),

  service_client: z.coerce.number().optional(),
  service_date: z.string().optional(),
  service_type: z.string().optional(),
  service_duration_minutes: z.string().optional(),

  freelance_client: z.coerce.number().optional(),
  freelance_project_name: z.string().optional(),
  freelance_start_date: z.string().optional(),
  freelance_delivery_date: z.string().optional(),
});
export type TransactionFormData = z.infer<typeof transactionSchema>;

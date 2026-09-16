import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { categoriesService } from "../services/categories.service";
import { installmentsService } from "../services/installments.service";
import { transactionsService } from "../services/transactions.service";
import type { Transaction, TransactionStatus, TransactionType } from "../types/transaction";
import { formatCurrency, parseCurrencyInput } from "../utils/currency";
import { formatDate, todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const STATUS_TONE: Record<TransactionStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PLANNED: "info",
  PENDING: "warning",
  PARTIAL: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PLANNED: "Prevista",
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const installmentSchema = z.object({
  description: z.string().min(1, "Informe uma descrição"),
  category: z.coerce.number().positive("Escolha uma categoria"),
  total_amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((value) => Number(parseCurrencyInput(value)) > 0, "Valor deve ser maior que zero"),
  installment_count: z.coerce.number().min(2, "Mínimo de 2 parcelas").max(360),
  first_due_date: z.string().min(1, "Informe a data da primeira parcela"),
});
type InstallmentFormData = z.infer<typeof installmentSchema>;

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [isInstallmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", typeFilter],
    queryFn: () => transactionsService.list(typeFilter ? { transaction_type: typeFilter } : {}),
  });

  const { data: expenseCategories } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => categoriesService.list("EXPENSE"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: { first_due_date: todayValue() },
  });

  const handleQuickSettle = async (transaction: Transaction) => {
    await transactionsService.addSettlement(transaction.id, {
      amount: transaction.remaining_amount,
      settlement_date: todayValue(),
      payment_method: "PIX",
    });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm(`Excluir "${transaction.title}"?`)) return;
    await transactionsService.remove(transaction.id);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const onCreateInstallmentPlan = async (data: InstallmentFormData) => {
    setServerError(null);
    try {
      await installmentsService.create({
        description: data.description,
        category: data.category,
        total_amount: parseCurrencyInput(data.total_amount),
        installment_count: data.installment_count,
        first_due_date: data.first_due_date,
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      reset();
      setInstallmentModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível criar o parcelamento."));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transações</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setInstallmentModalOpen(true)}>
            Parcelar despesa
          </Button>
          <Link to="/app/transactions/new">
            <Button>+ Nova transação</Button>
          </Link>
        </div>
      </div>

      <Select
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value as TransactionType | "")}
        className="w-48"
      >
        <option value="">Todas</option>
        <option value="INCOME">Receitas</option>
        <option value="EXPENSE">Despesas</option>
      </Select>

      {isLoading && <LoadingSpinner />}

      {!isLoading && (!data || data.results.length === 0) && (
        <EmptyState title="Nenhuma transação encontrada" description="Crie a primeira receita ou despesa." />
      )}

      {!isLoading && data && data.results.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.results.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDate(transaction.competence_date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {transaction.title}
                    <div className="mt-1 flex gap-1">
                      {transaction.is_recurring && <Badge tone="info">Recorrente</Badge>}
                      {transaction.is_installment && <Badge tone="info">Parcelado</Badge>}
                      {transaction.credit_card_name && <Badge tone="neutral">{transaction.credit_card_name}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {transaction.category_detail?.icon} {transaction.category_detail?.name}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      transaction.transaction_type === "INCOME" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {transaction.transaction_type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(transaction.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[transaction.status]}>{STATUS_LABEL[transaction.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {transaction.status !== "COMPLETED" && transaction.status !== "CANCELLED" && (
                        <Button variant="secondary" onClick={() => handleQuickSettle(transaction)}>
                          Marcar pago
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => handleDelete(transaction)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title="Parcelar despesa"
        isOpen={isInstallmentModalOpen}
        onClose={() => setInstallmentModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onCreateInstallmentPlan)} noValidate className="flex flex-col gap-4">
          <Input label="Descrição" {...register("description")} error={errors.description?.message} />
          <Select label="Categoria" {...register("category")} error={errors.category?.message} defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {expenseCategories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </Select>
          <Input
            label="Valor total (R$)"
            inputMode="decimal"
            placeholder="0,00"
            {...register("total_amount")}
            error={errors.total_amount?.message}
          />
          <Input
            label="Número de parcelas"
            type="number"
            min={2}
            max={360}
            {...register("installment_count")}
            error={errors.installment_count?.message}
          />
          <Input
            label="Data da 1ª parcela"
            type="date"
            {...register("first_due_date")}
            error={errors.first_due_date?.message}
          />
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            Criar parcelamento
          </Button>
        </form>
      </Modal>
    </div>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Select } from "../components/ui/Select";
import { transactionsService } from "../services/transactions.service";
import type { Transaction, TransactionStatus, TransactionType } from "../types/transaction";
import { formatCurrency } from "../utils/currency";
import { formatDate, todayValue } from "../utils/dates";

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

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", typeFilter],
    queryFn: () => transactionsService.list(typeFilter ? { transaction_type: typeFilter } : {}),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transações</h1>
        <Link to="/app/transactions/new">
          <Button>+ Nova transação</Button>
        </Link>
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
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{transaction.title}</td>
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
    </div>
  );
}

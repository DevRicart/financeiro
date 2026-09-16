import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { budgetsService } from "../services/budgets.service";
import { categoriesService } from "../services/categories.service";
import { formatCurrency } from "../utils/currency";
import { currentMonthValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthValue());
  const [isModalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "", limit_amount: "", alert_percentage: "80" });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => budgetsService.list(month),
  });

  const { data: expenseCategories } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => categoriesService.list("EXPENSE"),
  });

  const handleCreate = async () => {
    if (!form.category || !form.limit_amount) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await budgetsService.create({
        category: Number(form.category),
        month: `${month}-01`,
        limit_amount: form.limit_amount.replace(",", "."),
        alert_percentage: Number(form.alert_percentage),
      });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setForm({ category: "", limit_amount: "", alert_percentage: "80" });
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível criar o orçamento."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remover este orçamento?")) return;
    await budgetsService.remove(id);
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Orçamentos</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Button onClick={() => setModalOpen(true)}>+ Novo orçamento</Button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!budgets || budgets.length === 0) && (
        <EmptyState title="Nenhum orçamento neste mês" description="Defina um limite de gasto por categoria." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets?.map((budget) => (
          <Card key={budget.id}>
            <div className="flex items-start justify-between">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {budget.category_detail.icon} {budget.category_detail.name}
              </p>
              {budget.is_over_alert && <Badge tone="danger">Atenção</Badge>}
            </div>
            <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${budget.is_over_alert ? "bg-red-600" : "bg-slate-900 dark:bg-slate-100"}`}
                style={{ width: `${Math.min(100, budget.percentage_used)}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatCurrency(budget.spent_amount)} de {formatCurrency(budget.limit_amount)} (
              {budget.percentage_used}%)
            </p>
            <Button variant="ghost" className="mt-3 w-full" onClick={() => handleRemove(budget.id)}>
              Remover
            </Button>
          </Card>
        ))}
      </div>

      <Modal title="Novo orçamento" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select
            label="Categoria"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
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
            label="Limite mensal (R$)"
            inputMode="decimal"
            placeholder="0,00"
            value={form.limit_amount}
            onChange={(e) => setForm({ ...form, limit_amount: e.target.value })}
          />
          <Input
            label="Alertar ao atingir (%)"
            type="number"
            min={1}
            max={100}
            value={form.alert_percentage}
            onChange={(e) => setForm({ ...form, alert_percentage: e.target.value })}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleCreate} isLoading={isSubmitting}>
            Criar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

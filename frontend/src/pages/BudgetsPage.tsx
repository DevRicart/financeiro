import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { budgetsService } from "../services/budgets.service";
import { categoriesService } from "../services/categories.service";
import { formatCurrency, parseCurrencyInput } from "../utils/currency";
import { currentMonthValue, formatMonthLabel, shiftMonth } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

function daysRemainingIn(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNumber;
  return isCurrentMonth ? Math.max(0, lastDay - today.getDate()) : lastDay;
}

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthValue());
  const [isModalOpen, setModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
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

  const totalPlanned = budgets?.reduce((sum, budget) => sum + Number(budget.limit_amount), 0) ?? 0;
  const totalSpent = budgets?.reduce((sum, budget) => sum + Number(budget.spent_amount), 0) ?? 0;

  const handleCreate = async () => {
    if (!form.category || !form.limit_amount) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await budgetsService.create({
        category: Number(form.category),
        month: `${month}-01`,
        limit_amount: parseCurrencyInput(form.limit_amount),
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
    setOpenMenuId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Orçamentos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Um limite de gasto por categoria, renovado todo mês.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              aria-label="Mês anterior"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="w-36 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
              {formatMonthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              aria-label="Próximo mês"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Button onClick={() => setModalOpen(true)}>+ Novo orçamento</Button>
        </div>
      </div>

      {budgets && budgets.length > 0 && (
        <div className="flex gap-10">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Planejado</p>
            <p className="font-serif text-3xl font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(totalPlanned)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gasto até agora</p>
            <p className="font-serif text-3xl font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dias restantes</p>
            <p className="font-serif text-3xl font-medium text-slate-900 dark:text-slate-100">
              {daysRemainingIn(month)}
            </p>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!budgets || budgets.length === 0) && (
        <EmptyState title="Nenhum orçamento neste mês" description="Defina um limite de gasto por categoria." />
      )}

      {budgets && budgets.length > 0 && (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {budgets.map((budget) => (
            <div key={budget.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg dark:bg-slate-800">
                {budget.category_detail.icon}
              </span>
              <div className="min-w-[140px] flex-shrink-0">
                <p className="font-medium text-slate-900 dark:text-slate-100">{budget.category_detail.name}</p>
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${budget.is_over_alert ? "bg-red-600" : "bg-slate-800 dark:bg-slate-100"}`}
                  style={{ width: `${Math.min(100, budget.percentage_used)}%` }}
                />
              </div>
              <div className="w-52 flex-shrink-0 text-right">
                <p className={`font-medium ${budget.is_over_alert ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}>
                  {formatCurrency(budget.spent_amount)} de {formatCurrency(budget.limit_amount)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {budget.is_over_alert
                    ? `${formatCurrency(Number(budget.spent_amount) - Number(budget.limit_amount))} acima`
                    : `Restam ${formatCurrency(Number(budget.limit_amount) - Number(budget.spent_amount))}`}
                </p>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === budget.id ? null : budget.id)}
                  aria-label="Mais ações"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <MoreHorizontal size={16} />
                </button>
                {openMenuId === budget.id && (
                  <div className="absolute right-0 top-10 z-10 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => handleRemove(budget.id)}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

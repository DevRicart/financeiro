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
import type { MonthlyBudget } from "../types/budget";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "../utils/currency";
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
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
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

  const openCreateModal = () => {
    setEditingBudgetId(null);
    setError(null);
    setForm({ category: "", limit_amount: "", alert_percentage: "80" });
    setModalOpen(true);
  };

  const openEditModal = (budget: MonthlyBudget) => {
    setEditingBudgetId(budget.id);
    setError(null);
    setForm({
      category: String(budget.category),
      limit_amount: formatCurrencyInput(budget.limit_amount),
      alert_percentage: String(budget.alert_percentage),
    });
    setOpenMenuId(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.category || !form.limit_amount) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingBudgetId) {
        await budgetsService.update(editingBudgetId, {
          limit_amount: parseCurrencyInput(form.limit_amount),
          alert_percentage: Number(form.alert_percentage),
        });
      } else {
        await budgetsService.create({
          category: Number(form.category),
          month: `${month}-01`,
          limit_amount: parseCurrencyInput(form.limit_amount),
          alert_percentage: Number(form.alert_percentage),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setForm({ category: "", limit_amount: "", alert_percentage: "80" });
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível salvar o orçamento."));
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Orçamentos</h1>
          <p className="text-sm text-cinza dark:text-papel/60">Um limite de gasto por categoria, renovado todo mês.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              aria-label="Mês anterior"
              className="rounded-lg p-2 text-cinza hover:bg-nevoa dark:text-papel/60 dark:hover:bg-noite-borda"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="w-36 text-center text-sm font-medium text-tinta dark:text-papel">
              {formatMonthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              aria-label="Próximo mês"
              className="rounded-lg p-2 text-cinza hover:bg-nevoa dark:text-papel/60 dark:hover:bg-noite-borda"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Button onClick={openCreateModal}>+ Novo orçamento</Button>
        </div>
      </div>

      {budgets && budgets.length > 0 && (
        <div className="flex flex-wrap gap-6 sm:gap-10">
          <div>
            <p className="text-sm text-cinza dark:text-papel/60">Planejado</p>
            <p className="font-serif text-3xl font-medium text-tinta dark:text-papel">
              {formatCurrency(totalPlanned)}
            </p>
          </div>
          <div>
            <p className="text-sm text-cinza dark:text-papel/60">Gasto até agora</p>
            <p className="font-serif text-3xl font-medium text-tinta dark:text-papel">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-cinza dark:text-papel/60">Dias restantes</p>
            <p className="font-serif text-3xl font-medium text-tinta dark:text-papel">
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
        <div className="divide-y divide-cinza/15 rounded-xl border border-cinza/15 bg-white shadow-sm dark:divide-papel/10 dark:border-papel/10 dark:bg-noite-clara">
          {budgets.map((budget) => (
            <div key={budget.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-nevoa text-lg dark:bg-noite-borda">
                {budget.category_detail.icon}
              </span>
              <div className="min-w-0 flex-1 sm:min-w-[140px] sm:max-w-[140px] sm:flex-none">
                <p className="truncate font-medium text-tinta dark:text-papel">{budget.category_detail.name}</p>
              </div>
              <div className="flex-shrink-0 text-right sm:w-52">
                <p className={`font-medium ${budget.is_over_alert ? "text-despesa" : "text-tinta dark:text-papel"}`}>
                  {formatCurrency(budget.spent_amount)} de {formatCurrency(budget.limit_amount)}
                </p>
                <p className="text-xs text-cinza dark:text-papel/60">
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-cinza hover:bg-nevoa dark:text-papel/60 dark:hover:bg-noite-borda"
                >
                  <MoreHorizontal size={16} />
                </button>
                {openMenuId === budget.id && (
                  <div className="absolute right-0 top-10 z-10 w-36 rounded-lg border border-cinza/15 bg-white py-1 shadow-lg dark:border-papel/15 dark:bg-noite-clara">
                    <button
                      type="button"
                      onClick={() => openEditModal(budget)}
                      className="w-full px-3 py-2 text-left text-sm text-tinta hover:bg-nevoa dark:text-papel dark:hover:bg-noite-borda"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(budget.id)}
                      className="w-full px-3 py-2 text-left text-sm text-despesa hover:bg-despesa/10"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
              <div className="order-last h-2 w-full overflow-hidden rounded-full bg-nevoa dark:bg-noite-borda sm:order-none sm:w-auto sm:flex-1">
                <div
                  className={`h-full rounded-full ${budget.is_over_alert ? "bg-despesa" : "bg-petroleo"}`}
                  style={{ width: `${Math.min(100, budget.percentage_used)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title={editingBudgetId ? "Editar orçamento" : "Novo orçamento"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select
            label="Categoria"
            value={form.category}
            disabled={Boolean(editingBudgetId)}
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
          {error && <p className="text-sm text-despesa">{error}</p>}
          <Button onClick={handleSave} isLoading={isSubmitting}>
            {editingBudgetId ? "Salvar" : "Criar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

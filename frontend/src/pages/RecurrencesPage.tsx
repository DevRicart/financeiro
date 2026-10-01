import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { categoriesService } from "../services/categories.service";
import { recurrencesService } from "../services/recurrences.service";
import type { RecurrenceFrequency, RecurrenceRule, TransactionType } from "../types/transaction";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "../utils/currency";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

function frequencyDetail(rule: RecurrenceRule) {
  const day = Number(rule.start_date.split("-")[2]);
  if (rule.frequency === "MONTHLY") return `Mensal, todo dia ${day}`;
  return FREQUENCY_LABEL[rule.frequency];
}

const EMPTY_FORM = {
  title: "",
  transaction_type: "EXPENSE" as TransactionType,
  amount: "",
  category: "",
  frequency: "MONTHLY" as RecurrenceFrequency,
  start_date: todayValue(),
};

export function RecurrencesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const { data: rules, isLoading } = useQuery({ queryKey: ["recurrences"], queryFn: recurrencesService.list });
  const { data: formCategories } = useQuery({
    queryKey: ["categories", form.transaction_type],
    queryFn: () => categoriesService.list(form.transaction_type),
  });
  const { data: incomeCategories } = useQuery({
    queryKey: ["categories", "INCOME"],
    queryFn: () => categoriesService.list("INCOME"),
  });
  const { data: expenseCategories } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => categoriesService.list("EXPENSE"),
  });
  const allCategories = [...(incomeCategories ?? []), ...(expenseCategories ?? [])];

  const activeRules = rules?.filter((rule) => rule.is_active) ?? [];
  const monthlyIn = activeRules
    .filter((rule) => rule.transaction_type === "INCOME")
    .reduce((sum, rule) => sum + Number(rule.amount), 0);
  const monthlyOut = activeRules
    .filter((rule) => rule.transaction_type === "EXPENSE")
    .reduce((sum, rule) => sum + Number(rule.amount), 0);
  const pausedCount = (rules?.length ?? 0) - activeRules.length;

  const openCreateModal = () => {
    setEditingRuleId(null);
    setError(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (rule: RecurrenceRule) => {
    setEditingRuleId(rule.id);
    setError(null);
    setForm({
      title: rule.title,
      transaction_type: rule.transaction_type,
      amount: formatCurrencyInput(rule.amount),
      category: String(rule.category),
      frequency: rule.frequency,
      start_date: rule.start_date,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.amount || !form.category) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title,
        transaction_type: form.transaction_type,
        amount: parseCurrencyInput(form.amount),
        category: Number(form.category),
        frequency: form.frequency,
        start_date: form.start_date,
      };
      if (editingRuleId) {
        await recurrencesService.update(editingRuleId, payload);
      } else {
        await recurrencesService.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["recurrences"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível salvar a recorrência."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await recurrencesService.update(id, { is_active: !isActive });
    queryClient.invalidateQueries({ queryKey: ["recurrences"] });
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remover esta recorrência? As transações já geradas continuam existindo.")) return;
    await recurrencesService.remove(id);
    queryClient.invalidateQueries({ queryKey: ["recurrences"] });
  };

  const handleGenerateNow = async () => {
    const { created_count } = await recurrencesService.generate();
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    alert(created_count > 0 ? `${created_count} transação(ões) gerada(s).` : "Nada pendente para gerar.");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Recorrências</h1>
          <p className="text-sm text-cinza dark:text-papel/60">
            Salário, aluguel e assinaturas: lançamentos que se repetem sozinhos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="gap-1.5" onClick={handleGenerateNow}>
            <RefreshCw size={14} />
            Gerar lançamentos pendentes
          </Button>
          <Button onClick={openCreateModal}>+ Nova recorrência</Button>
        </div>
      </div>

      {rules && rules.length > 0 && (
        <div className="flex flex-wrap gap-6 sm:gap-10">
          <div>
            <p className="text-sm text-cinza dark:text-papel/60">Entra por mês</p>
            <p className="font-serif text-3xl font-medium text-receita">{formatCurrency(monthlyIn)}</p>
          </div>
          <div>
            <p className="text-sm text-cinza dark:text-papel/60">Sai por mês</p>
            <p className="font-serif text-3xl font-medium text-despesa">{formatCurrency(monthlyOut)}</p>
          </div>
          <div>
            <p className="text-sm text-cinza dark:text-papel/60">Pausadas</p>
            <p className="font-serif text-3xl font-medium text-tinta dark:text-papel">{pausedCount}</p>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!rules || rules.length === 0) && (
        <EmptyState title="Nenhuma recorrência cadastrada" description="Cadastre despesas ou receitas fixas." />
      )}

      {rules && rules.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-cinza/15 dark:border-papel/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-nevoa/40 text-xs uppercase text-cinza dark:bg-noite-clara dark:text-papel/60">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Frequência</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Ativa</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cinza/15 dark:divide-papel/10">
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-tinta dark:text-papel">{rule.title}</p>
                    <p className="text-xs text-cinza dark:text-papel/60">
                      {allCategories.find((category) => category.id === rule.category)?.name ?? ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-cinza dark:text-papel/60">{frequencyDetail(rule)}</td>
                  <td
                    className={`px-4 py-3 font-medium ${rule.transaction_type === "EXPENSE" ? "text-despesa" : "text-receita"}`}
                  >
                    {rule.transaction_type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(rule.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.is_active}
                      onClick={() => handleToggleActive(rule.id, rule.is_active)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        rule.is_active ? "bg-petroleo" : "bg-cinza/30 dark:bg-noite-borda"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          rule.is_active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        aria-label="Editar"
                        title="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-cinza hover:bg-nevoa dark:text-papel/60 dark:hover:bg-noite-borda"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(rule.id)}
                        aria-label="Remover"
                        title="Remover"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-cinza hover:bg-despesa/10 hover:text-despesa dark:text-papel/60"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editingRuleId ? "Editar recorrência" : "Nova recorrência"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Select
            label="Tipo"
            value={form.transaction_type}
            onChange={(e) => setForm({ ...form, transaction_type: e.target.value as TransactionType, category: "" })}
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>
          <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="" disabled>
              Selecione...
            </option>
            {formCategories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </Select>
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Select
            label="Frequência"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurrenceFrequency })}
          >
            <option value="MONTHLY">Mensal</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </Select>
          <Input
            label="Primeira ocorrência"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          {error && <p className="text-sm text-despesa">{error}</p>}
          <Button onClick={handleSave} isLoading={isSubmitting}>
            {editingRuleId ? "Salvar" : "Criar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

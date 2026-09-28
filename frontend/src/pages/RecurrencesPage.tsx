import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
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
import { formatCurrency, parseCurrencyInput } from "../utils/currency";
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

export function RecurrencesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    transaction_type: "EXPENSE" as TransactionType,
    amount: "",
    category: "",
    frequency: "MONTHLY" as RecurrenceFrequency,
    start_date: todayValue(),
  });

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

  const handleCreate = async () => {
    if (!form.title || !form.amount || !form.category) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await recurrencesService.create({
        title: form.title,
        transaction_type: form.transaction_type,
        amount: parseCurrencyInput(form.amount),
        category: Number(form.category),
        frequency: form.frequency,
        start_date: form.start_date,
      });
      queryClient.invalidateQueries({ queryKey: ["recurrences"] });
      setModalOpen(false);
      setForm({ ...form, title: "", amount: "", category: "" });
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível criar a recorrência."));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Recorrências</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Salário, aluguel e assinaturas: lançamentos que se repetem sozinhos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-1.5" onClick={handleGenerateNow}>
            <RefreshCw size={14} />
            Gerar lançamentos pendentes
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Nova recorrência</Button>
        </div>
      </div>

      {rules && rules.length > 0 && (
        <div className="flex gap-10">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Entra por mês</p>
            <p className="font-serif text-3xl font-medium text-green-700">{formatCurrency(monthlyIn)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sai por mês</p>
            <p className="font-serif text-3xl font-medium text-red-600">{formatCurrency(monthlyOut)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pausadas</p>
            <p className="font-serif text-3xl font-medium text-slate-900 dark:text-slate-100">{pausedCount}</p>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!rules || rules.length === 0) && (
        <EmptyState title="Nenhuma recorrência cadastrada" description="Cadastre despesas ou receitas fixas." />
      )}

      {rules && rules.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Frequência</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Ativa</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{rule.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {allCategories.find((category) => category.id === rule.category)?.name ?? ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{frequencyDetail(rule)}</td>
                  <td
                    className={`px-4 py-3 font-medium ${rule.transaction_type === "EXPENSE" ? "text-red-600" : "text-green-700"}`}
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
                        rule.is_active ? "bg-slate-800 dark:bg-slate-100" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-slate-900 ${
                          rule.is_active ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemove(rule.id)}
                        aria-label="Remover"
                        title="Remover"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400"
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

      <Modal title="Nova recorrência" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleCreate} isLoading={isSubmitting}>
            Criar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

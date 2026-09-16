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
import { categoriesService } from "../services/categories.service";
import { recurrencesService } from "../services/recurrences.service";
import type { RecurrenceFrequency, TransactionType } from "../types/transaction";
import { formatCurrency } from "../utils/currency";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

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
  const { data: categories } = useQuery({
    queryKey: ["categories", form.transaction_type],
    queryFn: () => categoriesService.list(form.transaction_type),
  });

  const handleCreate = async () => {
    if (!form.title || !form.amount || !form.category) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await recurrencesService.create({
        title: form.title,
        transaction_type: form.transaction_type,
        amount: form.amount.replace(",", "."),
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recorrências</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Salário, aluguel, assinaturas — lançamentos que se repetem automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleGenerateNow}>
            Gerar pendentes agora
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Nova recorrência</Button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!rules || rules.length === 0) && (
        <EmptyState title="Nenhuma recorrência cadastrada" description="Cadastre despesas ou receitas fixas." />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rules?.map((rule) => (
          <Card key={rule.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{rule.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {FREQUENCY_LABEL[rule.frequency]} · desde {rule.start_date}
                </p>
              </div>
              <Badge tone={rule.is_active ? "success" : "neutral"}>{rule.is_active ? "Ativa" : "Pausada"}</Badge>
            </div>
            <p
              className={`mt-2 text-lg font-semibold ${rule.transaction_type === "EXPENSE" ? "text-red-600" : "text-green-600"}`}
            >
              {formatCurrency(rule.amount)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => handleToggleActive(rule.id, rule.is_active)}>
                {rule.is_active ? "Pausar" : "Reativar"}
              </Button>
              <Button variant="ghost" onClick={() => handleRemove(rule.id)}>
                Remover
              </Button>
            </div>
          </Card>
        ))}
      </div>

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
            {categories?.map((category) => (
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

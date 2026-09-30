import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { debtSchema, type DebtFormData } from "../schemas/debt.schema";
import { clientsService } from "../services/clients.service";
import { debtRecurrencesService } from "../services/debt-recurrences.service";
import { debtsService } from "../services/debts.service";
import type { Debt, DebtRecurrenceRule } from "../types/debt";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "../utils/currency";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const FREQUENCY_LABEL: Record<DebtRecurrenceRule["frequency"], string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

const EMPTY_RECURRENCE_FORM = {
  person_name: "",
  reason: "",
  direction: "PAYABLE" as Debt["direction"],
  amount: "",
  frequency: "MONTHLY" as DebtRecurrenceRule["frequency"],
  start_date: todayValue(),
};

const STATUS_LABEL: Record<Debt["status"], string> = {
  OPEN: "Aberta",
  PARTIAL: "Parcial",
  PAID: "Paga",
  OVERDUE: "Atrasada",
  CANCELLED: "Cancelada",
};

export function DebtsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);
  const [nameMode, setNameMode] = useState<"client" | "custom">("custom");
  const [payingDebtId, setPayingDebtId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const [isRecurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [recurrenceForm, setRecurrenceForm] = useState(EMPTY_RECURRENCE_FORM);
  const [recurrenceError, setRecurrenceError] = useState<string | null>(null);
  const [isRecurrenceSubmitting, setIsRecurrenceSubmitting] = useState(false);

  const { data: debts, isLoading } = useQuery({ queryKey: ["debts"], queryFn: debtsService.list });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: clientsService.list });
  const { data: recurrences, isLoading: isLoadingRecurrences } = useQuery({
    queryKey: ["debt-recurrences"],
    queryFn: debtRecurrencesService.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormData>({ resolver: zodResolver(debtSchema), defaultValues: { direction: "PAYABLE" } });

  const handleNameModeChange = (mode: "client" | "custom") => {
    setNameMode(mode);
    if (mode === "client") {
      setValue("person_name", "");
    } else {
      setValue("client", undefined);
    }
  };

  const openCreateModal = () => {
    setEditingDebtId(null);
    setNameMode("custom");
    setServerError(null);
    reset({ direction: "PAYABLE", person_name: "", reason: "", total_amount: "", due_date: "" });
    setModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setNameMode(debt.client ? "client" : "custom");
    setServerError(null);
    reset({
      client: debt.client ?? undefined,
      person_name: debt.client ? "" : debt.person_name,
      reason: debt.reason,
      direction: debt.direction,
      total_amount: formatCurrencyInput(debt.total_amount),
      due_date: debt.due_date ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: DebtFormData) => {
    setServerError(null);
    try {
      const payload = {
        client: nameMode === "client" ? data.client : undefined,
        person_name: nameMode === "custom" ? data.person_name : undefined,
        reason: data.reason,
        direction: data.direction,
        total_amount: parseCurrencyInput(data.total_amount),
        due_date: data.due_date || null,
      };
      if (editingDebtId) {
        await debtsService.update(editingDebtId, payload);
      } else {
        await debtsService.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      reset();
      setNameMode("custom");
      setModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível salvar a dívida."));
    }
  };

  const handleDeleteDebt = async (debt: Debt) => {
    if (!confirm(`Excluir a dívida "${debt.reason}" com ${debt.display_name}?`)) return;
    await debtsService.remove(debt.id);
    queryClient.invalidateQueries({ queryKey: ["debts"] });
  };

  const handlePay = async (debtId: number) => {
    if (!paymentAmount) return;
    await debtsService.pay(debtId, {
      amount: parseCurrencyInput(paymentAmount),
      payment_date: todayValue(),
      payment_method: "PIX",
    });
    queryClient.invalidateQueries({ queryKey: ["debts"] });
    setPayingDebtId(null);
    setPaymentAmount("");
  };

  const handleCreateRecurrence = async () => {
    if (!recurrenceForm.person_name || !recurrenceForm.reason || !recurrenceForm.amount) return;
    setRecurrenceError(null);
    setIsRecurrenceSubmitting(true);
    try {
      await debtRecurrencesService.create({
        person_name: recurrenceForm.person_name,
        reason: recurrenceForm.reason,
        direction: recurrenceForm.direction,
        amount: parseCurrencyInput(recurrenceForm.amount),
        frequency: recurrenceForm.frequency,
        start_date: recurrenceForm.start_date,
      });
      queryClient.invalidateQueries({ queryKey: ["debt-recurrences"] });
      setRecurrenceForm(EMPTY_RECURRENCE_FORM);
      setRecurrenceModalOpen(false);
    } catch (error) {
      setRecurrenceError(extractErrorMessage(error, "Não foi possível criar a dívida recorrente."));
    } finally {
      setIsRecurrenceSubmitting(false);
    }
  };

  const handleToggleRecurrenceActive = async (rule: DebtRecurrenceRule) => {
    await debtRecurrencesService.update(rule.id, { is_active: !rule.is_active });
    queryClient.invalidateQueries({ queryKey: ["debt-recurrences"] });
  };

  const handleDeleteRecurrence = async (rule: DebtRecurrenceRule) => {
    if (!confirm(`Remover a dívida recorrente "${rule.reason}"? As dívidas já geradas continuam existindo.`)) return;
    await debtRecurrencesService.remove(rule.id);
    queryClient.invalidateQueries({ queryKey: ["debt-recurrences"] });
  };

  const handleGenerateRecurrences = async () => {
    const { created_count } = await debtRecurrencesService.generate();
    queryClient.invalidateQueries({ queryKey: ["debts"] });
    alert(created_count > 0 ? `${created_count} dívida(s) gerada(s).` : "Nada pendente para gerar.");
  };

  const receivable = debts?.filter((debt) => debt.direction === "RECEIVABLE") ?? [];
  const payable = debts?.filter((debt) => debt.direction === "PAYABLE") ?? [];
  const receivableTotal = receivable
    .filter((debt) => debt.status !== "PAID" && debt.status !== "CANCELLED")
    .reduce((sum, debt) => sum + Number(debt.remaining_amount), 0);
  const payableTotal = payable
    .filter((debt) => debt.status !== "PAID" && debt.status !== "CANCELLED")
    .reduce((sum, debt) => sum + Number(debt.remaining_amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Dívidas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Dinheiro que te devem e que você deve para alguém.</p>
        </div>
        <Button onClick={openCreateModal}>+ Nova dívida</Button>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">A receber</h2>
              <span className="font-serif text-2xl font-medium text-green-700">{formatCurrency(receivableTotal)}</span>
            </div>
            <div className="flex flex-col gap-3">
              {receivable.length === 0 ? (
                <EmptyDebtColumn text="Ninguém te deve nada no momento." />
              ) : (
                receivable.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    payingDebtId={payingDebtId}
                    paymentAmount={paymentAmount}
                    setPaymentAmount={setPaymentAmount}
                    setPayingDebtId={setPayingDebtId}
                    onPay={handlePay}
                    onEdit={openEditModal}
                    onDelete={handleDeleteDebt}
                    actionLabel="Registrar recebimento"
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">A pagar</h2>
              <span className="font-serif text-2xl font-medium text-red-600">{formatCurrency(payableTotal)}</span>
            </div>
            <div className="flex flex-col gap-3">
              {payable.length === 0 ? (
                <EmptyDebtColumn text="Quando pegar algo emprestado, registre aqui para lembrar quanto falta pagar." />
              ) : (
                payable.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    payingDebtId={payingDebtId}
                    paymentAmount={paymentAmount}
                    setPaymentAmount={setPaymentAmount}
                    setPayingDebtId={setPayingDebtId}
                    onPay={handlePay}
                    onEdit={openEditModal}
                    onDelete={handleDeleteDebt}
                    actionLabel="Registrar pagamento"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Dívidas recorrentes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Uma dívida que se repete sozinha todo mês (ou semana/ano), sem precisar cadastrar de novo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="gap-1.5" onClick={handleGenerateRecurrences}>
              <RefreshCw size={14} />
              Gerar pendentes
            </Button>
            <Button onClick={() => setRecurrenceModalOpen(true)}>+ Nova recorrência</Button>
          </div>
        </div>

        {isLoadingRecurrences && <LoadingSpinner />}
        {!isLoadingRecurrences && (!recurrences || recurrences.length === 0) && (
          <EmptyState title="Nenhuma dívida recorrente" description="Cadastre aluguéis, mensalidades ou parcelas que se repetem todo período." />
        )}

        {recurrences && recurrences.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Pessoa / Motivo</th>
                  <th className="px-4 py-3">Direção</th>
                  <th className="px-4 py-3">Frequência</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Ativa</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recurrences.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{rule.display_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{rule.reason}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {rule.direction === "PAYABLE" ? "A pagar" : "A receber"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{FREQUENCY_LABEL[rule.frequency]}</td>
                    <td
                      className={`px-4 py-3 font-medium ${rule.direction === "PAYABLE" ? "text-red-600" : "text-green-700"}`}
                    >
                      {formatCurrency(rule.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.is_active}
                        onClick={() => handleToggleRecurrenceActive(rule)}
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
                      <button
                        type="button"
                        onClick={() => handleDeleteRecurrence(rule)}
                        aria-label="Remover"
                        title="Remover"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal title={editingDebtId ? "Editar dívida" : "Nova dívida"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Pessoa</span>
            <div className="mb-2 flex gap-2">
              <Button
                type="button"
                variant={nameMode === "custom" ? "primary" : "secondary"}
                onClick={() => handleNameModeChange("custom")}
              >
                Nome personalizado
              </Button>
              <Button
                type="button"
                variant={nameMode === "client" ? "primary" : "secondary"}
                onClick={() => handleNameModeChange("client")}
              >
                Cliente cadastrado
              </Button>
            </div>

            {nameMode === "custom" ? (
              <Input placeholder="Nome da pessoa" {...register("person_name")} error={errors.person_name?.message} />
            ) : (
              <Select {...register("client")} error={errors.person_name?.message} defaultValue="">
                <option value="" disabled>
                  Selecione um cliente...
                </option>
                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.display_name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <Input label="Motivo" {...register("reason")} error={errors.reason?.message} />
          <Select label="Direção" {...register("direction")}>
            <option value="PAYABLE">Eu devo (a pagar)</option>
            <option value="RECEIVABLE">Me devem (a receber)</option>
          </Select>
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            placeholder="0,00"
            {...register("total_amount")}
            error={errors.total_amount?.message}
          />
          <Input label="Vencimento (opcional)" type="date" {...register("due_date")} />
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            {editingDebtId ? "Salvar" : "Cadastrar"}
          </Button>
        </form>
      </Modal>

      <Modal title="Nova dívida recorrente" isOpen={isRecurrenceModalOpen} onClose={() => setRecurrenceModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input
            label="Nome da pessoa"
            value={recurrenceForm.person_name}
            onChange={(e) => setRecurrenceForm({ ...recurrenceForm, person_name: e.target.value })}
          />
          <Input
            label="Motivo"
            value={recurrenceForm.reason}
            onChange={(e) => setRecurrenceForm({ ...recurrenceForm, reason: e.target.value })}
          />
          <Select
            label="Direção"
            value={recurrenceForm.direction}
            onChange={(e) => setRecurrenceForm({ ...recurrenceForm, direction: e.target.value as Debt["direction"] })}
          >
            <option value="PAYABLE">Eu devo (a pagar)</option>
            <option value="RECEIVABLE">Me devem (a receber)</option>
          </Select>
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            placeholder="0,00"
            value={recurrenceForm.amount}
            onChange={(e) => setRecurrenceForm({ ...recurrenceForm, amount: e.target.value })}
          />
          <Select
            label="Frequência"
            value={recurrenceForm.frequency}
            onChange={(e) =>
              setRecurrenceForm({ ...recurrenceForm, frequency: e.target.value as DebtRecurrenceRule["frequency"] })
            }
          >
            <option value="MONTHLY">Mensal</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </Select>
          <Input
            label="Primeira ocorrência"
            type="date"
            value={recurrenceForm.start_date}
            onChange={(e) => setRecurrenceForm({ ...recurrenceForm, start_date: e.target.value })}
          />
          {recurrenceError && <p className="text-sm text-red-600">{recurrenceError}</p>}
          <Button onClick={handleCreateRecurrence} isLoading={isRecurrenceSubmitting}>
            Criar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EmptyDebtColumn({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <HandCoins size={28} className="text-slate-300 dark:text-slate-600" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function DebtCard({
  debt,
  payingDebtId,
  paymentAmount,
  setPaymentAmount,
  setPayingDebtId,
  onPay,
  onEdit,
  onDelete,
  actionLabel,
}: {
  debt: Debt;
  payingDebtId: number | null;
  paymentAmount: string;
  setPaymentAmount: (value: string) => void;
  setPayingDebtId: (id: number | null) => void;
  onPay: (id: number) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  actionLabel: string;
}) {
  const paid = Number(debt.total_amount) - Number(debt.remaining_amount);
  const percentage = Number(debt.total_amount) > 0 ? (paid / Number(debt.total_amount)) * 100 : 0;
  const isSettled = debt.status === "PAID" || debt.status === "CANCELLED";

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {debt.display_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{debt.display_name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{debt.reason}</p>
        </div>
        {debt.status === "PARTIAL" && <Badge tone="warning">Parcial</Badge>}
        {debt.status === "OVERDUE" && <Badge tone="danger">Atrasada</Badge>}
        {isSettled && <Badge tone="success">{STATUS_LABEL[debt.status]}</Badge>}
        <button
          type="button"
          onClick={() => onEdit(debt)}
          aria-label="Editar dívida"
          title="Editar dívida"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(debt)}
          aria-label="Excluir dívida"
          title="Excluir dívida"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {isSettled ? formatCurrency(debt.total_amount) : `Falta ${formatCurrency(debt.remaining_amount)}`}
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-slate-800 dark:bg-slate-100"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {formatCurrency(paid)} de {formatCurrency(debt.total_amount)}
      </p>

      {!isSettled &&
        (payingDebtId === debt.id ? (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="0,00"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className="flex-1"
            />
            <Button onClick={() => onPay(debt.id)}>OK</Button>
          </div>
        ) : (
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setPayingDebtId(debt.id)}>
            {actionLabel}
          </Button>
        ))}
    </Card>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { debtSchema, type DebtFormData } from "../schemas/debt.schema";
import { clientsService } from "../services/clients.service";
import { debtsService } from "../services/debts.service";
import type { Debt } from "../types/debt";
import { formatCurrency, parseCurrencyInput } from "../utils/currency";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

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
  const [nameMode, setNameMode] = useState<"client" | "custom">("custom");
  const [payingDebtId, setPayingDebtId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: debts, isLoading } = useQuery({ queryKey: ["debts"], queryFn: debtsService.list });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: clientsService.list });

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

  const onSubmit = async (data: DebtFormData) => {
    setServerError(null);
    try {
      await debtsService.create({
        client: nameMode === "client" ? data.client : undefined,
        person_name: nameMode === "custom" ? data.person_name : undefined,
        reason: data.reason,
        direction: data.direction,
        total_amount: parseCurrencyInput(data.total_amount),
        due_date: data.due_date || null,
      });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      reset();
      setNameMode("custom");
      setModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível cadastrar a dívida."));
    }
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
        <Button onClick={() => setModalOpen(true)}>+ Nova dívida</Button>
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
                    actionLabel="Registrar pagamento"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Modal title="Nova dívida" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
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
            Cadastrar
          </Button>
        </form>
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
  actionLabel,
}: {
  debt: Debt;
  payingDebtId: number | null;
  paymentAmount: string;
  setPaymentAmount: (value: string) => void;
  setPayingDebtId: (id: number | null) => void;
  onPay: (id: number) => void;
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

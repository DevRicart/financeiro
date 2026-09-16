import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    // Clear whichever field the user isn't using so a stale value from
    // before a mode switch can never sneak into the submitted payload.
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dívidas</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nova dívida</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!debts || debts.length === 0) && (
        <EmptyState title="Nenhuma dívida cadastrada" description="Registre valores a pagar ou a receber." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {debts?.map((debt) => (
          <Card key={debt.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{debt.display_name}</h3>
              <Badge tone={debt.direction === "RECEIVABLE" ? "success" : "warning"}>
                {debt.direction === "RECEIVABLE" ? "A receber" : "A pagar"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{debt.reason}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(debt.remaining_amount)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              de {formatCurrency(debt.total_amount)} · {STATUS_LABEL[debt.status]}
            </p>

            {debt.status !== "PAID" &&
              debt.status !== "CANCELLED" &&
              (payingDebtId === debt.id ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="0,00"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => handlePay(debt.id)}>OK</Button>
                </div>
              ) : (
                <Button variant="secondary" className="mt-3 w-full" onClick={() => setPayingDebtId(debt.id)}>
                  Registrar pagamento
                </Button>
              ))}
          </Card>
        ))}
      </div>

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

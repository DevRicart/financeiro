import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { goalSchema, type GoalFormData } from "../schemas/goal.schema";
import { goalsService } from "../services/goals.service";
import type { FinancialGoal } from "../types/goal";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "../utils/currency";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [contributingGoalId, setContributingGoalId] = useState<number | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: goals, isLoading } = useQuery({ queryKey: ["goals"], queryFn: goalsService.list });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({ resolver: zodResolver(goalSchema), defaultValues: { goal_type: "INDIVIDUAL" } });

  const openCreateModal = () => {
    setEditingGoalId(null);
    setServerError(null);
    reset({ name: "", description: "", goal_type: "INDIVIDUAL", target_amount: "", deadline: "" });
    setModalOpen(true);
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingGoalId(goal.id);
    setServerError(null);
    reset({
      name: goal.name,
      description: goal.description,
      goal_type: goal.goal_type,
      target_amount: formatCurrencyInput(goal.target_amount),
      deadline: goal.deadline ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: GoalFormData) => {
    setServerError(null);
    try {
      const payload = {
        ...data,
        target_amount: parseCurrencyInput(data.target_amount),
        deadline: data.deadline || null,
      };
      if (editingGoalId) {
        await goalsService.update(editingGoalId, payload);
      } else {
        await goalsService.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      reset();
      setModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível salvar a meta."));
    }
  };

  const handleDelete = async (goal: FinancialGoal) => {
    if (!confirm(`Excluir a meta "${goal.name}"?`)) return;
    await goalsService.remove(goal.id);
    queryClient.invalidateQueries({ queryKey: ["goals"] });
  };

  const handleContribute = async (goalId: number) => {
    if (!contributionAmount) return;
    await goalsService.contribute(goalId, {
      amount: parseCurrencyInput(contributionAmount),
      contribution_date: todayValue(),
    });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    setContributingGoalId(null);
    setContributionAmount("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Metas</h1>
        <Button onClick={openCreateModal}>+ Nova meta</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!goals || goals.length === 0) && (
        <EmptyState title="Nenhuma meta ainda" description="Crie sua primeira meta financeira." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals?.map((goal) => (
          <Card key={goal.id}>
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate font-semibold text-tinta dark:text-papel">{goal.name}</h3>
              <span className="flex-shrink-0 rounded-full bg-nevoa px-2 py-0.5 text-xs text-cinza dark:bg-noite-borda dark:text-papel/60">
                {goal.goal_type === "SHARED" ? "Com parceiro" : "Individual"}
              </span>
              <button
                type="button"
                onClick={() => openEditModal(goal)}
                aria-label="Editar meta"
                title="Editar meta"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-cinza hover:bg-nevoa hover:text-tinta dark:text-papel/60 dark:hover:bg-noite-borda dark:hover:text-papel"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(goal)}
                aria-label="Excluir meta"
                title="Excluir meta"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-cinza hover:bg-despesa/10 hover:text-despesa dark:text-papel/60"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-2 font-serif text-3xl font-medium text-tinta dark:text-papel">
              {formatCurrency(goal.current_amount)}
              <span className="text-lg font-normal text-cinza/70"> de {formatCurrency(goal.target_amount)}</span>
            </p>
            <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-nevoa dark:bg-noite-borda">
              <div
                className="h-full rounded-full bg-petroleo"
                style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
              />
            </div>
            <p className="text-sm text-cinza dark:text-papel/60">{goal.progress_percentage}% concluído</p>

            {contributingGoalId === goal.id ? (
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="0,00"
                  value={contributionAmount}
                  onChange={(event) => setContributionAmount(event.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => handleContribute(goal.id)}>OK</Button>
              </div>
            ) : (
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setContributingGoalId(goal.id)}>
                + Guardar dinheiro
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal title={editingGoalId ? "Editar meta" : "Nova meta"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Nome" {...register("name")} error={errors.name?.message} />
          <Select label="Tipo" {...register("goal_type")}>
            <option value="INDIVIDUAL">Individual</option>
            <option value="SHARED">Compartilhada</option>
          </Select>
          <Input
            label="Valor alvo (R$)"
            inputMode="decimal"
            placeholder="0,00"
            {...register("target_amount")}
            error={errors.target_amount?.message}
          />
          <Input label="Prazo (opcional)" type="date" {...register("deadline")} />
          {serverError && <p className="text-sm text-despesa">{serverError}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            {editingGoalId ? "Salvar" : "Criar meta"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { formatCurrency } from "../utils/currency";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
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

  const onSubmit = async (data: GoalFormData) => {
    setServerError(null);
    try {
      await goalsService.create({
        ...data,
        target_amount: data.target_amount.replace(",", "."),
        deadline: data.deadline || null,
      });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      reset();
      setModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível criar a meta."));
    }
  };

  const handleContribute = async (goalId: number) => {
    if (!contributionAmount) return;
    await goalsService.contribute(goalId, {
      amount: contributionAmount.replace(",", "."),
      contribution_date: todayValue(),
    });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    setContributingGoalId(null);
    setContributionAmount("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Metas</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nova meta</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!goals || goals.length === 0) && (
        <EmptyState title="Nenhuma meta ainda" description="Crie sua primeira meta financeira." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals?.map((goal) => (
          <Card key={goal.id}>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{goal.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {goal.goal_type === "SHARED" ? "Compartilhada" : "Individual"}
            </p>
            <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)} (
              {goal.progress_percentage}%)
            </p>

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
                Contribuir
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal title="Nova meta" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            Criar meta
          </Button>
        </form>
      </Modal>
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { transactionSchema, type TransactionFormData } from "../schemas/transaction.schema";
import { categoriesService } from "../services/categories.service";
import { transactionsService } from "../services/transactions.service";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

export function TransactionFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_type: "EXPENSE",
      competence_date: todayValue(),
      is_shared: false,
    },
  });

  const transactionType = watch("transaction_type");

  const { data: categories } = useQuery({
    queryKey: ["categories", transactionType],
    queryFn: () => categoriesService.list(transactionType),
  });

  const onSubmit = async (data: TransactionFormData) => {
    setServerError(null);
    try {
      await transactionsService.create({
        transaction_type: data.transaction_type,
        category: data.category,
        title: data.title,
        description: data.description,
        total_amount: data.total_amount.replace(",", "."),
        competence_date: data.competence_date,
        due_date: data.due_date ? data.due_date : null,
        is_shared: data.is_shared,
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      navigate("/app/transactions");
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível salvar a transação."));
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Nova transação</h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <Select label="Tipo" {...register("transaction_type")}>
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </Select>

        <Select label="Categoria" {...register("category")} error={errors.category?.message} defaultValue="">
          <option value="" disabled>
            Selecione...
          </option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </Select>

        <Input label="Descrição" {...register("title")} error={errors.title?.message} />
        <Input
          label="Valor (R$)"
          inputMode="decimal"
          placeholder="0,00"
          {...register("total_amount")}
          error={errors.total_amount?.message}
        />
        <Input
          label="Data de competência"
          type="date"
          {...register("competence_date")}
          error={errors.competence_date?.message}
        />
        <Input label="Data de vencimento (opcional)" type="date" {...register("due_date")} />

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" {...register("is_shared")} />
          Compartilhada com o parceiro
        </label>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/app/transactions")}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}

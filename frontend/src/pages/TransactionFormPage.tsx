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
import { clientsService } from "../services/clients.service";
import { creditCardsService } from "../services/credit-cards.service";
import { transactionsService, type TransactionPayload } from "../services/transactions.service";
import { todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const INCOME_TYPE_LABEL: Record<string, string> = {
  SALARY: "Salário",
  APPOINTMENT: "Atendimento",
  FREELANCE: "Freelancer",
  EXTRA: "Receita extra",
  INVESTMENT: "Investimento",
  REFUND: "Reembolso",
  SALE: "Venda",
  OTHER: "Outros",
};

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
  const incomeType = watch("income_type");

  const { data: categories } = useQuery({
    queryKey: ["categories", transactionType],
    queryFn: () => categoriesService.list(transactionType),
  });

  const { data: creditCards } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: creditCardsService.list,
    enabled: transactionType === "EXPENSE",
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsService.list,
    enabled: transactionType === "INCOME" && (incomeType === "APPOINTMENT" || incomeType === "FREELANCE"),
  });

  const onSubmit = async (data: TransactionFormData) => {
    setServerError(null);
    try {
      const payload: TransactionPayload = {
        transaction_type: data.transaction_type,
        category: data.category,
        title: data.title,
        description: data.description,
        total_amount: data.total_amount.replace(",", "."),
        competence_date: data.competence_date,
        due_date: data.due_date ? data.due_date : null,
        is_shared: data.is_shared,
      };

      if (data.transaction_type === "INCOME" && data.income_type) {
        payload.income_type = data.income_type;

        if (data.income_type === "SALARY" && data.salary_net_amount) {
          payload.salary_detail = {
            employer_name: data.salary_employer_name ?? "",
            gross_amount: null,
            net_amount: data.salary_net_amount.replace(",", "."),
            reference_month: data.salary_reference_month || data.competence_date,
          };
        }

        if (data.income_type === "APPOINTMENT" && data.service_date) {
          payload.service_detail = {
            client: data.service_client ?? null,
            service_date: data.service_date,
            service_type: data.service_type ?? "",
            duration_minutes: data.service_duration_minutes ? Number(data.service_duration_minutes) : null,
          };
        }

        if (data.income_type === "FREELANCE" && data.freelance_project_name) {
          payload.freelance_detail = {
            client: data.freelance_client ?? null,
            project_name: data.freelance_project_name,
            start_date: data.freelance_start_date || null,
            delivery_date: data.freelance_delivery_date || null,
          };
        }
      }

      if (data.transaction_type === "EXPENSE" && data.credit_card) {
        payload.credit_card = data.credit_card;
      }

      await transactionsService.create(payload);
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

        {transactionType === "EXPENSE" && (
          <Select label="Cartão de crédito (opcional)" {...register("credit_card")} defaultValue="">
            <option value="">Nenhum — pagamento à vista</option>
            {creditCards?.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name} {card.last_four_digits && `•••• ${card.last_four_digits}`}
              </option>
            ))}
          </Select>
        )}

        {transactionType === "INCOME" && (
          <Select label="Tipo de receita (opcional)" {...register("income_type")} defaultValue="">
            <option value="">Não classificar</option>
            {Object.entries(INCOME_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}

        {transactionType === "INCOME" && incomeType === "SALARY" && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Input label="Empresa" {...register("salary_employer_name")} />
            <Input
              label="Valor líquido (R$)"
              inputMode="decimal"
              placeholder="0,00"
              {...register("salary_net_amount")}
            />
            <Input label="Mês de referência" type="date" {...register("salary_reference_month")} />
          </div>
        )}

        {transactionType === "INCOME" && incomeType === "APPOINTMENT" && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Select label="Cliente/paciente (opcional)" {...register("service_client")} defaultValue="">
              <option value="">Nenhum</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.display_name}
                </option>
              ))}
            </Select>
            <Input label="Data do atendimento" type="date" {...register("service_date")} />
            <Input label="Tipo de atendimento" {...register("service_type")} />
            <Input label="Duração (minutos)" type="number" {...register("service_duration_minutes")} />
          </div>
        )}

        {transactionType === "INCOME" && incomeType === "FREELANCE" && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Select label="Cliente (opcional)" {...register("freelance_client")} defaultValue="">
              <option value="">Nenhum</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.display_name}
                </option>
              ))}
            </Select>
            <Input label="Projeto" {...register("freelance_project_name")} />
            <Input label="Data inicial (opcional)" type="date" {...register("freelance_start_date")} />
            <Input label="Prazo de entrega (opcional)" type="date" {...register("freelance_delivery_date")} />
          </div>
        )}

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

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { accountSchema, type AccountFormData } from "../schemas/account.schema";
import { transactionsService } from "../services/transactions.service";
import { formatCurrency, parseCurrencyInput } from "../utils/currency";
import { extractErrorMessage } from "../utils/errors";

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  WALLET: "Carteira",
  DIGITAL: "Conta digital",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
};

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: transactionsService.listAccounts,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({ resolver: zodResolver(accountSchema), defaultValues: { account_type: "CHECKING" } });

  const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.initial_balance), 0) ?? 0;

  const onSubmit = async (data: AccountFormData) => {
    setServerError(null);
    try {
      await transactionsService.createAccount({
        ...data,
        initial_balance: data.initial_balance ? parseCurrencyInput(data.initial_balance) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      reset();
      setModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível criar a conta."));
    }
  };

  const handleRemove = async (accountId: number, name: string) => {
    if (!confirm(`Excluir a conta "${name}"?`)) return;
    await transactionsService.removeAccount(accountId);
    queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Contas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Onde seu dinheiro fica guardado.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nova conta</Button>
      </div>

      {accounts && accounts.length > 0 && (
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Saldo total</p>
          <p className="font-serif text-4xl font-medium text-slate-900 dark:text-slate-100">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!accounts || accounts.length === 0) && (
        <EmptyState
          title="Nenhuma conta ainda"
          description="Cadastre suas contas (corrente, carteira, digital...) para vincular pagamentos e importar extratos."
        />
      )}

      {accounts && accounts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                        {account.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{account.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {ACCOUNT_TYPE_LABEL[account.account_type] ?? account.account_type}
                          {account.institution && ` · ${account.institution}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(account.initial_balance)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemove(account.id, account.name)}
                        aria-label="Excluir"
                        title="Excluir"
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

      <Modal title="Nova conta" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Nome" {...register("name")} error={errors.name?.message} />
          <Select label="Tipo" {...register("account_type")}>
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input label="Instituição (opcional)" {...register("institution")} />
          <Input
            label="Saldo inicial (opcional)"
            inputMode="decimal"
            placeholder="0,00"
            {...register("initial_balance")}
            error={errors.initial_balance?.message}
          />
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            Criar conta
          </Button>
        </form>
      </Modal>
    </div>
  );
}

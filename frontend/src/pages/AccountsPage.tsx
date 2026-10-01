import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { BANKS, getBankColor } from "../constants/banks";
import { accountSchema, type AccountFormData } from "../schemas/account.schema";
import { transactionsService } from "../services/transactions.service";
import type { FinancialAccount } from "../types/transaction";
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
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
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

  const openCreateModal = () => {
    setEditingAccountId(null);
    setServerError(null);
    reset({ name: "", institution: "", account_type: "CHECKING", initial_balance: "" });
    setModalOpen(true);
  };

  const openEditModal = (account: FinancialAccount) => {
    setEditingAccountId(account.id);
    setServerError(null);
    reset({
      name: account.name,
      institution: account.institution,
      account_type: account.account_type as AccountFormData["account_type"],
      initial_balance: account.initial_balance,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: AccountFormData) => {
    setServerError(null);
    try {
      const payload = {
        ...data,
        initial_balance: data.initial_balance ? parseCurrencyInput(data.initial_balance) : undefined,
      };
      if (editingAccountId) {
        await transactionsService.updateAccount(editingAccountId, payload);
      } else {
        await transactionsService.createAccount(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      reset();
      setModalOpen(false);
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível salvar a conta."));
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
          <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Contas</h1>
          <p className="text-sm text-cinza dark:text-papel/60">Onde seu dinheiro fica guardado.</p>
        </div>
        <Button onClick={openCreateModal}>+ Nova conta</Button>
      </div>

      {accounts && accounts.length > 0 && (
        <div>
          <p className="text-sm text-cinza dark:text-papel/60">Saldo total</p>
          <p className="font-serif text-4xl font-medium text-tinta dark:text-papel">
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
        <div className="overflow-x-auto rounded-xl border border-cinza/15 dark:border-papel/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-nevoa/40 text-xs uppercase text-cinza dark:bg-noite-clara dark:text-papel/60">
              <tr>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cinza/15 dark:divide-papel/10">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        style={{ backgroundColor: getBankColor(account.institution) }}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
                      >
                        {account.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium text-tinta dark:text-papel">{account.name}</p>
                        <p className="text-xs text-cinza dark:text-papel/60">
                          {ACCOUNT_TYPE_LABEL[account.account_type] ?? account.account_type}
                          {account.institution && ` · ${account.institution}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-tinta dark:text-papel">
                    {formatCurrency(account.initial_balance)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(account)}
                        aria-label="Editar"
                        title="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-cinza hover:bg-nevoa dark:text-papel/60 dark:hover:bg-noite-borda"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(account.id, account.name)}
                        aria-label="Excluir"
                        title="Excluir"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-cinza hover:bg-despesa/10 hover:text-despesa dark:text-papel/60"
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

      <Modal title={editingAccountId ? "Editar conta" : "Nova conta"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Nome" {...register("name")} error={errors.name?.message} />
          <Select label="Tipo" {...register("account_type")}>
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Instituição (opcional)" {...register("institution")} defaultValue="">
            <option value="">Nenhuma</option>
            {BANKS.map((bank) => (
              <option key={bank.value} value={bank.value}>
                {bank.label}
              </option>
            ))}
          </Select>
          <Input
            label="Saldo inicial (opcional)"
            inputMode="decimal"
            placeholder="0,00"
            {...register("initial_balance")}
            error={errors.initial_balance?.message}
          />
          {serverError && <p className="text-sm text-despesa">{serverError}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            {editingAccountId ? "Salvar" : "Criar conta"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

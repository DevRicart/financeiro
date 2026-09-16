import { api, type Paginated } from "./api";
import type { FinancialAccount, PaymentMethod, Transaction, TransactionType } from "../types/transaction";

export interface TransactionFilters {
  transaction_type?: TransactionType;
  category?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}

export interface TransactionPayload {
  transaction_type: TransactionType;
  category: number;
  title: string;
  description?: string;
  total_amount: string;
  competence_date: string;
  due_date?: string | null;
  is_shared?: boolean;
  income_type?: string | null;
}

export const transactionsService = {
  async list(filters: TransactionFilters = {}) {
    const { data } = await api.get<Paginated<Transaction>>("/transactions/", { params: filters });
    return data;
  },

  async create(payload: TransactionPayload) {
    const { data } = await api.post<Transaction>("/transactions/", payload);
    return data;
  },

  async update(id: number, payload: Partial<TransactionPayload>) {
    const { data } = await api.patch<Transaction>(`/transactions/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/transactions/${id}/`);
  },

  async addSettlement(
    transactionId: number,
    payload: { amount: string; settlement_date: string; payment_method: PaymentMethod; account?: number | null; notes?: string },
  ) {
    const { data } = await api.post(`/transactions/${transactionId}/settlements/`, payload);
    return data;
  },

  async removeSettlement(settlementId: number) {
    await api.delete(`/settlements/${settlementId}/`);
  },

  async listAccounts() {
    const { data } = await api.get<FinancialAccount[]>("/financial-accounts/");
    return data;
  },
};

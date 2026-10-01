import { api, type Paginated } from "./api";
import type {
  FinancialAccount,
  FreelanceDetail,
  PaymentMethod,
  SalaryDetail,
  ServiceIncomeDetail,
  Transaction,
  TransactionType,
} from "../types/transaction";

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
  credit_card?: number;
  salary_detail?: SalaryDetail;
  service_detail?: Omit<ServiceIncomeDetail, "client_name">;
  freelance_detail?: Omit<FreelanceDetail, "client_name">;
}

export const transactionsService = {
  async list(filters: TransactionFilters = {}) {
    const { data } = await api.get<Paginated<Transaction>>("/transactions/", { params: filters });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get<Transaction>(`/transactions/${id}/`);
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

  async createAccount(payload: {
    name: string;
    institution?: string;
    account_type: string;
    initial_balance?: string;
  }) {
    const { data } = await api.post<FinancialAccount>("/financial-accounts/", payload);
    return data;
  },

  async updateAccount(
    accountId: number,
    payload: Partial<{ name: string; institution: string; account_type: string; initial_balance: string }>,
  ) {
    const { data } = await api.patch<FinancialAccount>(`/financial-accounts/${accountId}/`, payload);
    return data;
  },

  async removeAccount(accountId: number) {
    await api.delete(`/financial-accounts/${accountId}/`);
  },
};

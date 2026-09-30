import { api } from "./api";
import type { Debt } from "../types/debt";

interface DebtPayload {
  client?: number;
  person_name?: string;
  reason: string;
  direction: "RECEIVABLE" | "PAYABLE";
  total_amount: string;
  due_date?: string | null;
}

export const debtsService = {
  async list() {
    const { data } = await api.get<Debt[]>("/debts/");
    return data;
  },

  async create(payload: DebtPayload) {
    const { data } = await api.post<Debt>("/debts/", payload);
    return data;
  },

  async update(id: number, payload: DebtPayload) {
    const { data } = await api.patch<Debt>(`/debts/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/debts/${id}/`);
  },

  async pay(debtId: number, payload: { amount: string; payment_date: string; payment_method: string; notes?: string }) {
    const { data } = await api.post(`/debts/${debtId}/payments/`, payload);
    return data;
  },
};

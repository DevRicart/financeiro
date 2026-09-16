import { api } from "./api";
import type { Debt } from "../types/debt";

export const debtsService = {
  async list() {
    const { data } = await api.get<Debt[]>("/debts/");
    return data;
  },

  async create(payload: {
    client?: number;
    person_name?: string;
    reason: string;
    direction: "RECEIVABLE" | "PAYABLE";
    total_amount: string;
    due_date?: string | null;
  }) {
    const { data } = await api.post<Debt>("/debts/", payload);
    return data;
  },

  async pay(debtId: number, payload: { amount: string; payment_date: string; payment_method: string; notes?: string }) {
    const { data } = await api.post(`/debts/${debtId}/payments/`, payload);
    return data;
  },
};

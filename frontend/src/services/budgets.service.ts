import { api } from "./api";
import type { MonthlyBudget } from "../types/budget";

export const budgetsService = {
  async list(month?: string) {
    const { data } = await api.get<MonthlyBudget[]>("/budgets/", { params: month ? { month } : undefined });
    return data;
  },

  async create(payload: { category: number; month: string; limit_amount: string; alert_percentage?: number }) {
    const { data } = await api.post<MonthlyBudget>("/budgets/", payload);
    return data;
  },

  async update(id: number, payload: Partial<{ limit_amount: string; alert_percentage: number }>) {
    const { data } = await api.patch<MonthlyBudget>(`/budgets/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/budgets/${id}/`);
  },
};

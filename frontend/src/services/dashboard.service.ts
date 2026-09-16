import { api } from "./api";
import type { CoupleSummary, DashboardSummary, ExpenseByCategory, MonthlyEvolutionPoint } from "../types/dashboard";

export const dashboardService = {
  async summary(month?: string) {
    const { data } = await api.get<DashboardSummary>("/dashboard/summary/", { params: { month } });
    return data;
  },

  async expensesByCategory(month?: string) {
    const { data } = await api.get<ExpenseByCategory[]>("/dashboard/expenses-by-category/", {
      params: { month },
    });
    return data;
  },

  async monthlyEvolution(months = 6) {
    const { data } = await api.get<MonthlyEvolutionPoint[]>("/dashboard/monthly-evolution/", {
      params: { months },
    });
    return data;
  },

  async coupleSummary(month?: string) {
    const { data } = await api.get<CoupleSummary>("/dashboard/couple-summary/", { params: { month } });
    return data;
  },
};

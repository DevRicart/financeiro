import { api } from "./api";
import type { FinancialGoal } from "../types/goal";

export const goalsService = {
  async list() {
    const { data } = await api.get<FinancialGoal[]>("/goals/");
    return data;
  },

  async create(payload: {
    name: string;
    description?: string;
    goal_type: "INDIVIDUAL" | "SHARED";
    target_amount: string;
    deadline?: string | null;
  }) {
    const { data } = await api.post<FinancialGoal>("/goals/", payload);
    return data;
  },

  async contribute(goalId: number, payload: { amount: string; contribution_date: string; notes?: string }) {
    const { data } = await api.post(`/goals/${goalId}/contributions/`, payload);
    return data;
  },
};

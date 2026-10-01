import { api } from "./api";
import type { FinancialGoal } from "../types/goal";

interface GoalPayload {
  name: string;
  description?: string;
  goal_type: "INDIVIDUAL" | "SHARED";
  target_amount: string;
  deadline?: string | null;
}

export const goalsService = {
  async list() {
    const { data } = await api.get<FinancialGoal[]>("/goals/");
    return data;
  },

  async create(payload: GoalPayload) {
    const { data } = await api.post<FinancialGoal>("/goals/", payload);
    return data;
  },

  async update(id: number, payload: Partial<GoalPayload>) {
    const { data } = await api.patch<FinancialGoal>(`/goals/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/goals/${id}/`);
  },

  async contribute(goalId: number, payload: { amount: string; contribution_date: string; notes?: string }) {
    const { data } = await api.post(`/goals/${goalId}/contributions/`, payload);
    return data;
  },
};

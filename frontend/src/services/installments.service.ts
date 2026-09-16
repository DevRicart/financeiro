import { api } from "./api";
import type { InstallmentPlan } from "../types/transaction";

export const installmentsService = {
  async list() {
    const { data } = await api.get<InstallmentPlan[]>("/installment-plans/");
    return data;
  },

  async create(payload: {
    description: string;
    category: number;
    total_amount: string;
    installment_count: number;
    first_due_date: string;
    is_shared?: boolean;
  }) {
    const { data } = await api.post<InstallmentPlan>("/installment-plans/", payload);
    return data;
  },

  async remove(planId: number) {
    await api.delete(`/installment-plans/${planId}/`);
  },
};

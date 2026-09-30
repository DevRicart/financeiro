import { api } from "./api";
import type { DebtRecurrenceRule } from "../types/debt";

interface DebtRecurrenceRulePayload {
  client?: number;
  person_name?: string;
  reason: string;
  direction: "RECEIVABLE" | "PAYABLE";
  amount: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  start_date: string;
  end_date?: string | null;
}

export const debtRecurrencesService = {
  async list() {
    const { data } = await api.get<DebtRecurrenceRule[]>("/debt-recurrences/");
    return data;
  },

  async create(payload: DebtRecurrenceRulePayload) {
    const { data } = await api.post<DebtRecurrenceRule>("/debt-recurrences/", payload);
    return data;
  },

  async update(id: number, payload: Partial<DebtRecurrenceRulePayload & { is_active: boolean }>) {
    const { data } = await api.patch<DebtRecurrenceRule>(`/debt-recurrences/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/debt-recurrences/${id}/`);
  },

  async generate() {
    const { data } = await api.post<{ created_count: number }>("/debt-recurrences/generate/");
    return data;
  },
};

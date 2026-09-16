import { api } from "./api";
import type { RecurrenceRule } from "../types/transaction";

export const recurrencesService = {
  async list() {
    const { data } = await api.get<RecurrenceRule[]>("/recurrences/");
    return data;
  },

  async create(payload: {
    title: string;
    transaction_type: "INCOME" | "EXPENSE";
    amount: string;
    category: number;
    frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
    start_date: string;
    end_date?: string | null;
  }) {
    const { data } = await api.post<RecurrenceRule>("/recurrences/", payload);
    return data;
  },

  async update(id: number, payload: Partial<{ is_active: boolean }>) {
    const { data } = await api.patch<RecurrenceRule>(`/recurrences/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/recurrences/${id}/`);
  },

  async generate() {
    const { data } = await api.post<{ created_count: number }>("/recurrences/generate/");
    return data;
  },
};

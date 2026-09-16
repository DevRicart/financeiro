import { api } from "./api";
import type { CreditCard, Invoice } from "../types/transaction";

export const creditCardsService = {
  async list() {
    const { data } = await api.get<CreditCard[]>("/credit-cards/");
    return data;
  },

  async create(payload: {
    name: string;
    institution: string;
    last_four_digits?: string;
    credit_limit?: string | null;
    closing_day: number;
    due_day: number;
  }) {
    const { data } = await api.post<CreditCard>("/credit-cards/", payload);
    return data;
  },

  async getInvoice(cardId: number, month: string) {
    const { data } = await api.get<Invoice>(`/credit-cards/${cardId}/invoice/`, { params: { month } });
    return data;
  },

  async payInvoice(cardId: number, payload: { month: string; payment_date: string; account?: number }) {
    const { data } = await api.post<{ settled_count: number }>(
      `/credit-cards/${cardId}/invoice/pay/`,
      payload,
    );
    return data;
  },
};

import { api } from "./api";
import type { Client } from "../types/client";

export const clientsService = {
  async list() {
    const { data } = await api.get<Client[]>("/clients/");
    return data;
  },

  async create(payload: { display_name: string; email?: string; phone?: string; notes?: string }) {
    const { data } = await api.post<Client>("/clients/", payload);
    return data;
  },
};

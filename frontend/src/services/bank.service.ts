import { api, type Paginated } from "./api";
import type { BankConnection, ImportedTransaction } from "../types/bank";

export const bankService = {
  async createConnectToken(itemId?: string) {
    const { data } = await api.post<{ access_token: string }>("/bank/connect-token/", {
      item_id: itemId,
    });
    return data.access_token;
  },

  async listConnections() {
    const { data } = await api.get<BankConnection[]>("/bank/connections/");
    return data;
  },

  async registerConnection(itemId: string) {
    const { data } = await api.post<BankConnection>("/bank/connections/", { item_id: itemId });
    return data;
  },

  async syncConnection(connectionId: number) {
    const { data } = await api.post<BankConnection>(`/bank/connections/${connectionId}/sync/`);
    return data;
  },

  async syncAll() {
    const { data } = await api.post<BankConnection[]>("/bank/sync-all/");
    return data;
  },

  async listPendingImports(page = 1) {
    const { data } = await api.get<Paginated<ImportedTransaction>>("/bank/imports/", {
      params: { status: "PENDING_REVIEW", page },
    });
    return data;
  },

  async confirmImport(
    importId: number,
    payload: { category: number; title: string; description?: string; is_shared?: boolean },
  ) {
    const { data } = await api.post<ImportedTransaction>(`/bank/imports/${importId}/confirm/`, payload);
    return data;
  },

  async ignoreImport(importId: number) {
    const { data } = await api.post<ImportedTransaction>(`/bank/imports/${importId}/ignore/`);
    return data;
  },
};

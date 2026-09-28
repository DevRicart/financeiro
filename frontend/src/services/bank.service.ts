import { api, type Paginated } from "./api";
import type { ImportedTransaction, StatementImport } from "../types/bank";

export const bankService = {
  async uploadStatement(accountId: number, file: File) {
    const formData = new FormData();
    formData.append("account", String(accountId));
    formData.append("file", file);
    const { data } = await api.post<StatementImport>("/bank/statements/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async listImportHistory() {
    const { data } = await api.get<StatementImport[]>("/bank/statements/history/");
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

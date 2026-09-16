import { api } from "./api";
import type { TransactionFilters } from "./transactions.service";

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const reportsService = {
  async downloadTransactions(type: "csv" | "xlsx", filters: TransactionFilters = {}) {
    const { data } = await api.get(`/reports/transactions/export/`, {
      params: { ...filters, type },
      responseType: "blob",
    });
    triggerDownload(data, `transacoes.${type}`);
  },

  async downloadMonthlySummaryPdf(month: string) {
    const { data } = await api.get("/reports/monthly-summary/pdf/", {
      params: { month },
      responseType: "blob",
    });
    triggerDownload(data, `resumo-${month}.pdf`);
  },
};

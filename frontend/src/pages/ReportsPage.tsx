import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { reportsService } from "../services/reports.service";
import type { TransactionType } from "../types/transaction";
import { currentMonthValue } from "../utils/dates";

export function ReportsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    setIsDownloading("pdf");
    try {
      await reportsService.downloadMonthlySummaryPdf(month);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadTransactions = async (type: "csv" | "xlsx") => {
    setIsDownloading(type);
    try {
      await reportsService.downloadTransactions(type, {
        transaction_type: typeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Relatórios</h1>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Resumo mensal (PDF)</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Um resumo pronto para imprimir ou compartilhar: receitas, despesas e gastos por categoria do mês.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Button onClick={handleDownloadPdf} isLoading={isDownloading === "pdf"}>
            Baixar PDF
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Exportar transações</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Planilha com todas as transações no período e filtros escolhidos — útil para conferência ou backup.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Tipo"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TransactionType | "")}
            className="w-40"
          >
            <option value="">Todas</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </Select>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => handleDownloadTransactions("csv")}
            isLoading={isDownloading === "csv"}
          >
            Baixar CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDownloadTransactions("xlsx")}
            isLoading={isDownloading === "xlsx"}
          >
            Baixar Excel
          </Button>
        </div>
      </Card>
    </div>
  );
}

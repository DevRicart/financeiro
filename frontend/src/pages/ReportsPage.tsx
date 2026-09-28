import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
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
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Relatórios</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Baixe seus dados para imprimir, compartilhar ou guardar como backup.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <FileText size={20} />
          </span>
          <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Resumo do mês</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            PDF com receitas, despesas e gastos por categoria, pronto para imprimir.
          </p>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div>
            <Button onClick={handleDownloadPdf} isLoading={isDownloading === "pdf"}>
              Baixar PDF
            </Button>
          </div>
        </Card>

        <Card>
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <FileSpreadsheet size={20} />
          </span>
          <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Exportar transações</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Planilha com todas as transações do período, para conferência ou backup.
          </p>

          <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</p>
          <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {(["", "INCOME", "EXPENSE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === value
                    ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {value === "" ? "Todas" : value === "INCOME" ? "Receitas" : "Despesas"}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
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
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleDownloadTransactions("xlsx")} isLoading={isDownloading === "xlsx"}>
              Baixar Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownloadTransactions("csv")}
              isLoading={isDownloading === "csv"}
            >
              Baixar CSV
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

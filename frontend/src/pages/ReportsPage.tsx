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
        <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Relatórios</h1>
        <p className="text-sm text-cinza dark:text-papel/60">Baixe seus dados para imprimir, compartilhar ou guardar como backup.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-nevoa text-petroleo dark:bg-noite-borda dark:text-luz">
            <FileText size={20} />
          </span>
          <h2 className="mb-1 font-semibold text-tinta dark:text-papel">Resumo do mês</h2>
          <p className="mb-4 text-sm text-cinza dark:text-papel/60">
            PDF com receitas, despesas e gastos por categoria, pronto para imprimir.
          </p>
          <label className="mb-1 block text-sm font-medium text-tinta dark:text-papel">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mb-4 rounded-lg border border-cinza/30 px-3 py-2 text-sm dark:border-papel/15 dark:bg-noite-clara dark:text-papel"
          />
          <div>
            <Button onClick={handleDownloadPdf} isLoading={isDownloading === "pdf"}>
              Baixar PDF
            </Button>
          </div>
        </Card>

        <Card>
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-nevoa text-petroleo dark:bg-noite-borda dark:text-luz">
            <FileSpreadsheet size={20} />
          </span>
          <h2 className="mb-1 font-semibold text-tinta dark:text-papel">Exportar transações</h2>
          <p className="mb-4 text-sm text-cinza dark:text-papel/60">
            Planilha com todas as transações do período, para conferência ou backup.
          </p>

          <p className="mb-1 text-sm font-medium text-tinta dark:text-papel">Tipo</p>
          <div className="mb-4 inline-flex rounded-lg border border-cinza/15 p-0.5 dark:border-papel/10">
            {(["", "INCOME", "EXPENSE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === value
                    ? "bg-petroleo text-white"
                    : "text-cinza dark:text-papel/60"
                }`}
              >
                {value === "" ? "Todas" : value === "INCOME" ? "Receitas" : "Despesas"}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-tinta dark:text-papel">De</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-lg border border-cinza/30 px-3 py-2 text-sm dark:border-papel/15 dark:bg-noite-clara dark:text-papel"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-tinta dark:text-papel">Até</label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-lg border border-cinza/30 px-3 py-2 text-sm dark:border-papel/15 dark:bg-noite-clara dark:text-papel"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

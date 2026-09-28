import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileDown, FileUp, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { dashboardService } from "../services/dashboard.service";
import { recurrencesService } from "../services/recurrences.service";
import { formatCurrency } from "../utils/currency";
import { currentMonthValue, formatMonthLabel, shiftMonth } from "../utils/dates";

const CATEGORY_BAR_COLOR = "#4a6350";

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonthValue());

  useEffect(() => {
    // Gera lançamentos recorrentes pendentes assim que o dashboard abre.
    // Sem recorrências cadastradas, isso é um no-op.
    recurrencesService.generate().catch(() => undefined);
  }, []);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", month],
    queryFn: () => dashboardService.summary(month),
  });

  const expensesQuery = useQuery({
    queryKey: ["dashboard-expenses-by-category", month],
    queryFn: () => dashboardService.expensesByCategory(month),
  });

  const evolutionQuery = useQuery({
    queryKey: ["dashboard-monthly-evolution"],
    queryFn: () => dashboardService.monthlyEvolution(6),
  });

  const coupleQuery = useQuery({
    queryKey: ["dashboard-couple-summary", month],
    queryFn: () => dashboardService.coupleSummary(month),
  });

  if (summaryQuery.isLoading) return <LoadingSpinner label="Carregando dashboard..." />;

  const summary = summaryQuery.data;
  const netResult = (summary?.accrual_profit ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{formatMonthLabel(month)}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Resumo do mês, com o que já aconteceu e o que ainda vai entrar ou sair.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
            aria-label="Mês anterior"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
            aria-label="Próximo mês"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resultado previsto do mês</p>
          <p className={`mt-1 font-serif text-4xl font-medium ${netResult ? "text-green-700" : "text-red-600"}`}>
            {formatCurrency(summary?.accrual_profit ?? 0)}
          </p>
          {(summary?.income_pending ?? 0) > 0 && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Considera os {formatCurrency(summary?.income_pending ?? 0)} pendentes de recebimento.
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Recebido</p>
              <p className="mt-0.5 font-medium text-green-700">{formatCurrency(summary?.income_received ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Pago</p>
              <p className="mt-0.5 font-medium text-red-600">{formatCurrency(summary?.expense_paid ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Saldo realizado</p>
              <p className={`mt-0.5 font-medium ${(summary?.cash_profit ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                {formatCurrency(summary?.cash_profit ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          <MiniStat
            icon={FileDown}
            label="A receber"
            detail={(summary?.income_pending ?? 0) > 0 ? "Ainda tem lançamento pendente" : "Nada pendente"}
            value={formatCurrency(summary?.income_pending ?? 0)}
            tone="income"
          />
          <MiniStat
            icon={FileUp}
            label="A pagar"
            detail={(summary?.expense_pending ?? 0) > 0 ? "Ainda tem lançamento pendente" : "Nada pendente"}
            value={formatCurrency(summary?.expense_pending ?? 0)}
            tone="expense"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Despesas por categoria</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {formatCurrency(summary?.expense_paid ?? 0)}
            </span>
          </div>
          {expensesQuery.data && expensesQuery.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, expensesQuery.data.length * 36)}>
              <BarChart
                data={expensesQuery.data}
                layout="vertical"
                margin={{ left: 12, right: 24, top: 0, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid horizontal={false} stroke="#eae8e0" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category__name"
                  width={110}
                  tick={{ fontSize: 13, fill: "#38493c" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => formatCurrency(String(value))} />
                <Bar dataKey="total" fill={CATEGORY_BAR_COLOR} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma despesa neste mês ainda.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Últimos 6 meses</h2>
          {evolutionQuery.data && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolutionQuery.data} barGap={4}>
                <CartesianGrid vertical={false} stroke="#eae8e0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#66806c" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#66806c" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(String(value))} />
                <Bar dataKey="income" fill="#16a34a" name="Receita" radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="expense" fill="#dc2626" name="Despesa" radius={[3, 3, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {coupleQuery.data && coupleQuery.data.partners.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Visão do casal</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Você
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Receita: {formatCurrency(coupleQuery.data.own.income_total)} · Despesa:{" "}
                {formatCurrency(coupleQuery.data.own.expense_total)}
              </p>
            </div>

            {coupleQuery.data.partners.map((partner) => (
              <div key={partner.partnership_id}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {partner.partner_name}
                </p>
                {!partner.shares_income_totals && !partner.shares_expense_totals ? (
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                    Não compartilha totais com você.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {partner.shares_income_totals && `Receita: ${formatCurrency(partner.income_total ?? 0)}`}
                    {partner.shares_income_totals && partner.shares_expense_totals && " · "}
                    {partner.shares_expense_totals && `Despesa: ${formatCurrency(partner.expense_total ?? 0)}`}
                  </p>
                )}
              </div>
            ))}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Conjunto
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${coupleQuery.data.combined.balance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                Saldo: {formatCurrency(coupleQuery.data.combined.balance)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  detail,
  value,
  tone,
}: {
  icon: typeof Repeat;
  label: string;
  detail: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
          tone === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
        }`}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <p className={`flex-shrink-0 font-medium ${tone === "income" ? "text-green-700" : "text-red-600"}`}>{value}</p>
    </div>
  );
}

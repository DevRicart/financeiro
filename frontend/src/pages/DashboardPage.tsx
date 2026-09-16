import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { bankService } from "../services/bank.service";
import { dashboardService } from "../services/dashboard.service";
import { formatCurrency } from "../utils/currency";
import { currentMonthValue } from "../utils/dates";

const CHART_COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#16a34a", "#dc2626", "#2563eb"];

export function DashboardPage() {
  const [month] = useState(currentMonthValue());

  useEffect(() => {
    // "quando eu acessar o aplicativo": refresca as conexões bancárias
    // conectadas assim que o dashboard abre. Sem conexões, é um no-op.
    bankService.syncAll().catch(() => undefined);
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

  if (summaryQuery.isLoading) return <LoadingSpinner label="Carregando dashboard..." />;

  const summary = summaryQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Mês de referência: {month}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Receita recebida" value={summary?.income_received} tone="income" />
        <SummaryCard label="Despesa paga" value={summary?.expense_paid} tone="expense" />
        <SummaryCard
          label="Saldo do mês"
          value={summary?.cash_profit}
          tone={(summary?.cash_profit ?? 0) >= 0 ? "income" : "expense"}
        />
        <SummaryCard label="A receber" value={summary?.income_pending} tone="neutral" />
        <SummaryCard label="A pagar" value={summary?.expense_pending} tone="neutral" />
        <SummaryCard
          label="Resultado (competência)"
          value={summary?.accrual_profit}
          tone={(summary?.accrual_profit ?? 0) >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Despesas por categoria</h2>
          {expensesQuery.data && expensesQuery.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expensesQuery.data} dataKey="total" nameKey="category__name" innerRadius={60} outerRadius={100}>
                  {expensesQuery.data.map((entry, index) => (
                    <Cell key={entry.category__id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(String(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma despesa neste mês ainda.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Evolução mensal</h2>
          {evolutionQuery.data && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolutionQuery.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(String(value))} />
                <Bar dataKey="income" fill="#16a34a" name="Receita" />
                <Bar dataKey="expense" fill="#dc2626" name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone: "income" | "expense" | "neutral";
}) {
  const toneClass =
    tone === "income" ? "text-green-600" : tone === "expense" ? "text-red-600" : "text-slate-900 dark:text-slate-100";
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{formatCurrency(value ?? 0)}</p>
    </Card>
  );
}

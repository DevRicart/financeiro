export interface DashboardSummary {
  month: string;
  income_total: number;
  income_received: number;
  income_pending: number;
  expense_total: number;
  expense_paid: number;
  expense_pending: number;
  cash_profit: number;
  accrual_profit: number;
}

export interface ExpenseByCategory {
  category__id: number;
  category__name: string;
  category__icon: string;
  category__color: string;
  total: number;
}

export interface MonthlyEvolutionPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

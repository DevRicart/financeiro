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

export interface CoupleSummaryPartner {
  partnership_id: number;
  partner_id: number;
  partner_name: string;
  shares_income_totals: boolean;
  shares_expense_totals: boolean;
  shares_goals: boolean;
  shares_debts: boolean;
  income_total?: number;
  income_received?: number;
  expense_total?: number;
  expense_paid?: number;
}

export interface CoupleSummary {
  month: string;
  own: Omit<DashboardSummary, "month">;
  partners: CoupleSummaryPartner[];
  combined: {
    income_total: number;
    expense_total: number;
    balance: number;
  };
}

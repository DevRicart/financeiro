import type { Category } from "./category";

export interface MonthlyBudget {
  id: number;
  category: number;
  category_detail: Category;
  month: string;
  limit_amount: string;
  alert_percentage: number;
  spent_amount: number;
  percentage_used: number;
  is_over_alert: boolean;
}

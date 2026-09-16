import type { Category } from "./category";

export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionStatus = "PLANNED" | "PENDING" | "PARTIAL" | "COMPLETED" | "CANCELLED";
export type IncomeType =
  | "SALARY"
  | "APPOINTMENT"
  | "FREELANCE"
  | "EXTRA"
  | "INVESTMENT"
  | "REFUND"
  | "SALE"
  | "OTHER";
export type PaymentMethod =
  | "PIX"
  | "CASH"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "BOLETO"
  | "OTHER";

export interface TransactionSettlement {
  id: number;
  transaction: number;
  amount: string;
  settlement_date: string;
  payment_method: PaymentMethod;
  account: number | null;
  notes: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  transaction_type: TransactionType;
  income_type: IncomeType | null;
  category: number;
  category_detail: Category;
  title: string;
  description: string;
  total_amount: string;
  competence_date: string;
  due_date: string | null;
  status: TransactionStatus;
  is_shared: boolean;
  settlements: TransactionSettlement[];
  settled_amount: string;
  remaining_amount: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialAccount {
  id: number;
  name: string;
  institution: string;
  account_type: string;
  initial_balance: string;
  is_active: boolean;
}

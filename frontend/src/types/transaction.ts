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

export interface SalaryDetail {
  employer_name: string;
  gross_amount: string | null;
  net_amount: string;
  reference_month: string;
}

export interface ServiceIncomeDetail {
  client: number | null;
  client_name?: string;
  service_date: string;
  service_type: string;
  duration_minutes: number | null;
}

export interface FreelanceDetail {
  client: number | null;
  client_name?: string;
  project_name: string;
  start_date: string | null;
  delivery_date: string | null;
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
  salary_detail: SalaryDetail | null;
  service_detail: ServiceIncomeDetail | null;
  freelance_detail: FreelanceDetail | null;
  is_recurring: boolean;
  is_installment: boolean;
  is_credit_card_purchase: boolean;
  credit_card_name?: string;
  invoice_month?: string;
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

export interface CreditCard {
  id: number;
  name: string;
  institution: string;
  last_four_digits: string;
  credit_limit: string | null;
  closing_day: number;
  due_day: number;
  is_active: boolean;
}

export interface CreditCardPurchase {
  id: number;
  transaction: number;
  transaction_title: string;
  transaction_amount: string;
  transaction_status: TransactionStatus;
  credit_card: number;
  purchase_date: string;
  invoice_month: string;
}

export interface Invoice {
  month: string;
  total: number;
  purchases: CreditCardPurchase[];
}

export interface Installment {
  id: number;
  number: number;
  transaction: number;
  transaction_detail: Transaction;
}

export interface InstallmentPlan {
  id: number;
  description: string;
  total_amount: string;
  installment_count: number;
  first_due_date: string;
  installments: Installment[];
  created_at: string;
}

export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurrenceRule {
  id: number;
  title: string;
  transaction_type: TransactionType;
  amount: string;
  category: number;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

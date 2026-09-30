export interface DebtPayment {
  id: number;
  debt: number;
  amount: string;
  payment_date: string;
  payment_method: string;
  notes: string;
}

export interface Debt {
  id: number;
  client: number | null;
  client_name?: string;
  person_name: string;
  display_name: string;
  reason: string;
  direction: "RECEIVABLE" | "PAYABLE";
  total_amount: string;
  due_date: string | null;
  status: "OPEN" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  recurrence_rule: number | null;
  payments: DebtPayment[];
  paid_amount: number;
  remaining_amount: number;
  created_at: string;
}

export interface DebtRecurrenceRule {
  id: number;
  client: number | null;
  client_name?: string;
  person_name: string;
  display_name: string;
  reason: string;
  direction: "RECEIVABLE" | "PAYABLE";
  amount: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

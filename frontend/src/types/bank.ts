import type { Category } from "./category";

export interface SyncedAccount {
  id: number;
  name: string;
  account_type: string;
  balance: string;
  currency_code: string;
  financial_account: number | null;
}

export interface BankConnection {
  id: number;
  institution_name: string;
  status: "UPDATING" | "UPDATED" | "LOGIN_ERROR" | "OUTDATED" | "ERROR";
  last_synced_at: string | null;
  created_at: string;
  accounts: SyncedAccount[];
}

export interface ImportedTransaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  status: "PENDING_REVIEW" | "CONFIRMED" | "IGNORED";
  suggested_category: number | null;
  suggested_category_detail: Category | null;
  account_name: string;
  created_at: string;
}

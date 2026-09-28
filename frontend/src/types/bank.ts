import type { Category } from "./category";

export interface StatementImport {
  id: number;
  account: number;
  account_name: string;
  file_name: string;
  transaction_count: number;
  imported_at: string;
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

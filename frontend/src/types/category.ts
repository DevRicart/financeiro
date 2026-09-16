export type CategoryType = "INCOME" | "EXPENSE" | "BOTH";

export interface Category {
  id: number;
  name: string;
  category_type: CategoryType;
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  owner: number | null;
}

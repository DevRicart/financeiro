export interface Client {
  id: number;
  display_name: string;
  internal_code: string;
  default_amount: string | null;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

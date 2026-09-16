import { api } from "./api";

export interface PartnershipPermissions {
  share_income_totals: boolean;
  share_income_details: boolean;
  share_expense_totals: boolean;
  share_expense_details: boolean;
  share_client_names: boolean;
  share_goals: boolean;
  share_debts: boolean;
  share_accounts: boolean;
}

export interface Partnership {
  id: number;
  creator: number;
  creator_email: string;
  partner: number;
  partner_email: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "ENDED";
  permissions: PartnershipPermissions | null;
  created_at: string;
  accepted_at: string | null;
}

export const couplesService = {
  async list() {
    const { data } = await api.get<Partnership[]>("/partnerships/");
    return data;
  },

  async invite(partnerEmail: string) {
    const { data } = await api.post<Partnership>("/partnerships/invite/", { partner_email: partnerEmail });
    return data;
  },

  async accept(id: number) {
    const { data } = await api.post<Partnership>(`/partnerships/${id}/accept/`);
    return data;
  },

  async reject(id: number) {
    const { data } = await api.post<Partnership>(`/partnerships/${id}/reject/`);
    return data;
  },

  async updatePermissions(id: number, payload: Partial<PartnershipPermissions>) {
    const { data } = await api.patch<PartnershipPermissions>(`/partnerships/${id}/permissions/`, payload);
    return data;
  },

  async end(id: number) {
    await api.delete(`/partnerships/${id}/`);
  },
};

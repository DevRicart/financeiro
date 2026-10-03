import { api, tokenStorage } from "./api";
import type { LoginResponse, User } from "../types/auth";

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>("/auth/login/", { email, password });
    tokenStorage.setTokens(data.access, data.refresh);
    return data.user;
  },

  // No session yet: the account only works after the e-mail link is confirmed.
  async register(payload: { email: string; password: string; preferred_name?: string }) {
    await api.post("/auth/register/", payload);
  },

  async verifyEmail(token: string) {
    await api.post("/auth/verify-email/", { token });
  },

  async resendVerification(email: string) {
    await api.post("/auth/resend-verification/", { email });
  },

  async me() {
    const { data } = await api.get<User>("/auth/me/");
    return data;
  },

  async updateMe(payload: Partial<Pick<User, "preferred_name" | "currency" | "timezone">>) {
    const { data } = await api.patch<User>("/auth/me/", payload);
    return data;
  },

  async requestPasswordReset(email: string) {
    await api.post("/auth/password-reset/", { email });
  },

  async confirmPasswordReset(payload: { uid: string; token: string; new_password: string }) {
    await api.post("/auth/password-reset/confirm/", payload);
  },

  async logout() {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) await api.post("/auth/logout/", { refresh });
    } finally {
      tokenStorage.clear();
    }
  },

  async deleteAccount(password: string) {
    await api.post("/auth/delete-account/", { password });
    tokenStorage.clear();
  },
};

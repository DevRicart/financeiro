import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { tokenStorage } from "../services/api";
import { authService } from "../services/auth.service";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; preferred_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccess()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await authService.me();
      setUser(me);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(
    async (payload: { email: string; password: string; preferred_name?: string }) => {
      await authService.register(payload);
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await authService.deleteAccount(password);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, deleteAccount, refreshUser }),
    [user, isLoading, login, register, logout, deleteAccount, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

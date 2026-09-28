import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { AccountsPage } from "../pages/AccountsPage";
import { BudgetsPage } from "../pages/BudgetsPage";
import { ClientsPage } from "../pages/ClientsPage";
import { CreditCardsPage } from "../pages/CreditCardsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DebtsPage } from "../pages/DebtsPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { GoalsPage } from "../pages/GoalsPage";
import { ImportsPage } from "../pages/ImportsPage";
import { LoginPage } from "../pages/LoginPage";
import { PartnershipPage } from "../pages/PartnershipPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RecurrencesPage } from "../pages/RecurrencesPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ReportsPage } from "../pages/ReportsPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { TransactionFormPage } from "../pages/TransactionFormPage";
import { TransactionsPage } from "../pages/TransactionsPage";
import { ProtectedRoute } from "./protected-route";
import { PublicRoute } from "./public-route";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/transactions" element={<TransactionsPage />} />
          <Route path="/app/transactions/new" element={<TransactionFormPage />} />
          <Route path="/app/transactions/:id/edit" element={<TransactionFormPage />} />
          <Route path="/app/accounts" element={<AccountsPage />} />
          <Route path="/app/credit-cards" element={<CreditCardsPage />} />
          <Route path="/app/recurrences" element={<RecurrencesPage />} />
          <Route path="/app/budgets" element={<BudgetsPage />} />
          <Route path="/app/goals" element={<GoalsPage />} />
          <Route path="/app/debts" element={<DebtsPage />} />
          <Route path="/app/clients" element={<ClientsPage />} />
          <Route path="/app/imports" element={<ImportsPage />} />
          <Route path="/app/reports" element={<ReportsPage />} />
          <Route path="/app/partnership" element={<PartnershipPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}

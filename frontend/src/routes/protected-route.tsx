import { Navigate, Outlet } from "react-router-dom";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner label="Carregando sessão..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

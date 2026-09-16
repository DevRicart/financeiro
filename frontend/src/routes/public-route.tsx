import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function PublicRoute() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) return <Navigate to="/app/dashboard" replace />;

  return <Outlet />;
}

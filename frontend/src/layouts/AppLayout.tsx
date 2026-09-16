import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Olá, {user?.preferred_name || user?.username}
          </span>
          <Button variant="ghost" onClick={() => logout()}>
            Sair
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

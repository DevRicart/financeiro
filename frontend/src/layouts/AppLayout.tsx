import { Plus } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { ALL_NAV_LINKS } from "../components/navigation/nav-groups";
import { Button } from "../components/ui/Button";

export function AppLayout() {
  const location = useLocation();
  const currentLink = ALL_NAV_LINKS.find((link) => location.pathname.startsWith(link.to));

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {currentLink ? `${currentLink.group} / ${currentLink.label}` : "Financeiro"}
          </span>
          <Link to="/app/transactions/new">
            <Button className="gap-1.5">
              <Plus size={16} strokeWidth={2} />
              Nova transação
            </Button>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

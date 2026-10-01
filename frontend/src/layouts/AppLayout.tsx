import { Menu, Plus } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { ALL_NAV_LINKS } from "../components/navigation/nav-groups";
import { Button } from "../components/ui/Button";

export function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const currentLink = ALL_NAV_LINKS.find((link) => location.pathname.startsWith(link.to));

  return (
    <div className="flex h-screen bg-papel dark:bg-noite">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-cinza/15 px-4 py-3 dark:border-papel/10 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-cinza hover:bg-nevoa dark:text-papel/70 dark:hover:bg-noite-borda lg:hidden"
            >
              <Menu size={20} />
            </button>
            <span className="truncate text-sm text-cinza dark:text-papel/60">
              {currentLink ? `${currentLink.group} / ${currentLink.label}` : "Lumi Finance"}
            </span>
          </div>
          <Link to="/app/transactions/new" className="flex-shrink-0">
            <Button className="gap-1.5">
              <Plus size={16} strokeWidth={2} />
              <span className="hidden sm:inline">Nova transação</span>
            </Button>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

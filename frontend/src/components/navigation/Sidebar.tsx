import { useQuery } from "@tanstack/react-query";
import { LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { bankService } from "../../services/bank.service";
import { Logo } from "../Logo";
import { NAV_GROUPS } from "./nav-groups";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  const pendingImportsQuery = useQuery({
    queryKey: ["bank-imports", "count"],
    queryFn: () => bankService.listPendingImports(),
    staleTime: 60_000,
  });
  const pendingCount = pendingImportsQuery.data?.count ?? 0;

  const displayName = user?.preferred_name || user?.username || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-tinta/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-shrink-0 flex-col border-r border-cinza/15 bg-papel transition-transform dark:border-papel/10 dark:bg-noite lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-5">
          <Logo className="h-7 w-auto" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-cinza hover:bg-nevoa dark:text-papel/70 dark:hover:bg-noite-borda lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-cinza/70 dark:text-papel/40">
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const badge = link.badgeKey === "pendingImports" ? pendingCount : 0;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-nevoa text-tinta dark:bg-noite-borda dark:text-papel"
                            : "text-cinza hover:bg-nevoa/60 dark:text-papel/70 dark:hover:bg-noite-borda/60"
                        }`
                      }
                    >
                      <Icon size={18} strokeWidth={1.75} />
                      <span className="flex-1">{link.label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-luz-escura/15 px-2 py-0.5 text-xs font-semibold text-luz-escura">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-cinza/15 px-4 py-3 dark:border-papel/10">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-nevoa font-medium text-tinta dark:bg-noite-borda dark:text-papel">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-tinta dark:text-papel">{displayName}</p>
            <p className="truncate text-xs text-cinza dark:text-papel/60">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Sair"
            title="Sair"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-cinza hover:bg-nevoa hover:text-tinta dark:text-papel/60 dark:hover:bg-noite-borda dark:hover:text-papel"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </nav>
    </>
  );
}

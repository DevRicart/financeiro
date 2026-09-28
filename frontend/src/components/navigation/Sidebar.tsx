import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { bankService } from "../../services/bank.service";
import { NAV_GROUPS } from "./nav-groups";

export function Sidebar() {
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
    <nav className="flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 font-serif text-base italic text-white dark:bg-slate-100 dark:text-slate-900">
          f
        </span>
        <span className="font-serif text-lg font-semibold text-slate-900 dark:text-slate-100">Financeiro</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
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
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    <span className="flex-1">{link.label}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
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

      <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          aria-label="Sair"
          title="Sair"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <LogOut size={16} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );
}

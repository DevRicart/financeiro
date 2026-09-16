import { NavLink } from "react-router-dom";

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/app/transactions", label: "Transações", icon: "💳" },
  { to: "/app/imports", label: "Importações", icon: "🏦" },
  { to: "/app/goals", label: "Metas", icon: "🎯" },
  { to: "/app/debts", label: "Dívidas", icon: "🤝" },
  { to: "/app/partnership", label: "Parceiro", icon: "❤️" },
  { to: "/app/profile", label: "Perfil", icon: "⚙️" },
];

export function Sidebar() {
  return (
    <nav className="flex h-full w-56 flex-shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-4 px-2 text-lg font-bold text-slate-900 dark:text-slate-100">Financeiro</p>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`
          }
        >
          <span>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

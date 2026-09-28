import {
  ArrowLeftRight,
  CreditCard,
  FileText,
  Flag,
  HandCoins,
  Heart,
  LayoutDashboard,
  Landmark,
  Repeat,
  Settings,
  Target,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "pendingImports";
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Visão geral",
    links: [{ to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Dinheiro",
    links: [
      { to: "/app/transactions", label: "Transações", icon: ArrowLeftRight },
      { to: "/app/accounts", label: "Contas", icon: Landmark },
      { to: "/app/credit-cards", label: "Cartões", icon: CreditCard },
      { to: "/app/recurrences", label: "Recorrências", icon: Repeat },
      { to: "/app/imports", label: "Importações", icon: Upload, badgeKey: "pendingImports" },
    ],
  },
  {
    title: "Planejamento",
    links: [
      { to: "/app/budgets", label: "Orçamentos", icon: Target },
      { to: "/app/goals", label: "Metas", icon: Flag },
      { to: "/app/debts", label: "Dívidas", icon: HandCoins },
    ],
  },
  {
    title: "Pessoas",
    links: [
      { to: "/app/clients", label: "Clientes", icon: Users },
      { to: "/app/partnership", label: "Parceiro", icon: Heart },
    ],
  },
  {
    title: "Outros",
    links: [
      { to: "/app/reports", label: "Relatórios", icon: FileText },
      { to: "/app/profile", label: "Perfil", icon: Settings },
    ],
  },
];

export const ALL_NAV_LINKS: (NavLink & { group: string })[] = NAV_GROUPS.flatMap((group) =>
  group.links.map((link) => ({ ...link, group: group.title })),
);

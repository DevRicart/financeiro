import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">Financeiro</h1>
        <Outlet />
      </div>
    </div>
  );
}

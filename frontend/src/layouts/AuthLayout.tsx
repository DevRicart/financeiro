import { Outlet } from "react-router-dom";
import { Logo, Symbol } from "../components/Logo";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-papel dark:bg-noite">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo className="h-7 w-auto" />
          </div>
          <Outlet />
        </div>
      </div>

      <div className="relative hidden w-1/2 flex-col items-center justify-center bg-petroleo lg:flex">
        <Symbol size="completo" onDark className="h-32 w-auto" />
        <p className="mt-[30px] font-serif text-2xl text-papel">Seu mês, linha por linha.</p>
      </div>
    </div>
  );
}

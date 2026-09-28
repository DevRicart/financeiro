import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, type LoginFormData } from "../schemas/auth.schema";
import { extractErrorMessage } from "../utils/errors";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate("/app/dashboard");
    } catch (error) {
      setServerError(extractErrorMessage(error, "E-mail ou senha inválidos."));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <Input label="E-mail" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Senha
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-400">
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          revealable
          autoComplete="current-password"
          {...register("password")}
          error={errors.password?.message}
        />
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" isLoading={isSubmitting}>
        Entrar
      </Button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Não tem conta?{" "}
        <Link to="/register" className="font-medium text-slate-900 underline dark:text-slate-100">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

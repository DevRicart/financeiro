import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ResendVerification } from "../components/auth/ResendVerification";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, type LoginFormData } from "../schemas/auth.schema";
import { extractErrorMessage, getErrorCode } from "../utils/errors";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setUnverifiedEmail(null);
    try {
      await login(data.email, data.password);
      navigate("/app/dashboard");
    } catch (error) {
      setServerError(extractErrorMessage(error, "E-mail ou senha inválidos."));
      if (getErrorCode(error) === "email_not_verified") setUnverifiedEmail(data.email);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl font-medium text-tinta dark:text-papel">Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="E-mail" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-tinta dark:text-papel">
              Senha
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-petroleo hover:underline dark:text-luz">
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
        {serverError && <p className="text-sm text-despesa">{serverError}</p>}
        {unverifiedEmail && <ResendVerification email={unverifiedEmail} />}
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Entrar
        </Button>
        <p className="text-center text-sm text-cinza dark:text-papel/70">
          Não tem conta?{" "}
          <Link to="/register" className="font-medium text-petroleo underline dark:text-luz">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}

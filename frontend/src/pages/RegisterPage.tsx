import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { registerSchema, type RegisterFormData } from "../schemas/auth.schema";
import { extractErrorMessage } from "../utils/errors";

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        preferred_name: data.preferred_name,
        email: data.email,
        password: data.password,
      });
      navigate("/app/dashboard");
    } catch (error) {
      setServerError(extractErrorMessage(error, "Não foi possível criar a conta."));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <Input label="Nome" {...register("preferred_name")} error={errors.preferred_name?.message} />
      <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message} />
      <Input
        label="Senha"
        type="password"
        revealable
        {...register("password")}
        error={errors.password?.message}
      />
      <Input
        label="Confirmar senha"
        type="password"
        revealable
        {...register("confirm_password")}
        error={errors.confirm_password?.message}
      />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" isLoading={isSubmitting}>
        Criar conta
      </Button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-slate-900 underline dark:text-slate-100">
          Entrar
        </Link>
      </p>
    </form>
  );
}

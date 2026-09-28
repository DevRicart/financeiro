import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await authService.requestPasswordReset(data.email);
    // Sempre mostra a mesma mensagem, exista ou não a conta — evita
    // confirmar para quem não deveria quais e-mails estão cadastrados.
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.
        </p>
        <Link to="/login" className="text-center text-sm font-medium text-slate-900 underline dark:text-slate-100">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>
      <Input label="E-mail" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <Button type="submit" isLoading={isSubmitting}>
        Enviar link
      </Button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        <Link to="/login" className="font-medium text-slate-900 underline dark:text-slate-100">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}

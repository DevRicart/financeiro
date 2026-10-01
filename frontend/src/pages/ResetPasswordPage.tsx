import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { resetPasswordSchema, type ResetPasswordFormData } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";
import { extractErrorMessage } from "../utils/errors";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null);
    try {
      await authService.confirmPasswordReset({ uid, token, new_password: data.password });
      navigate("/login");
    } catch (error) {
      setServerError(extractErrorMessage(error, "Link inválido ou expirado. Peça um novo."));
    }
  };

  if (!uid || !token) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-serif text-4xl font-medium text-tinta dark:text-papel">Link inválido</h1>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-despesa">Peça um novo link de redefinição.</p>
          <Link to="/forgot-password" className="text-center text-sm font-medium text-petroleo underline dark:text-luz">
            Esqueci minha senha
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl font-medium text-tinta dark:text-papel">Redefinir senha</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label="Nova senha"
          type="password"
          revealable
          {...register("password")}
          error={errors.password?.message}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          revealable
          {...register("confirm_password")}
          error={errors.confirm_password?.message}
        />
        {serverError && <p className="text-sm text-despesa">{serverError}</p>}
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Redefinir senha
        </Button>
      </form>
    </div>
  );
}

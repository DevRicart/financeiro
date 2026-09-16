import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth.service";
import { extractErrorMessage } from "../utils/errors";

const profileSchema = z.object({
  preferred_name: z.string().min(1, "Informe seu nome"),
  currency: z.string().min(3, "Use o código de 3 letras (ex: BRL)").max(3),
  timezone: z.string().min(1, "Informe o fuso horário"),
});
type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      preferred_name: user?.preferred_name ?? "",
      currency: user?.currency ?? "BRL",
      timezone: user?.timezone ?? "America/Sao_Paulo",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setMessage(null);
    setError(null);
    try {
      await authService.updateMe(data);
      await refreshUser();
      setMessage("Perfil atualizado.");
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível atualizar o perfil."));
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Perfil</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="E-mail" value={user?.email ?? ""} disabled />
          <Input label="Nome" {...register("preferred_name")} error={errors.preferred_name?.message} />
          <Input label="Moeda" {...register("currency")} error={errors.currency?.message} />
          <Input label="Fuso horário" {...register("timezone")} error={errors.timezone?.message} />
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            Salvar
          </Button>
        </form>
      </Card>
    </div>
  );
}

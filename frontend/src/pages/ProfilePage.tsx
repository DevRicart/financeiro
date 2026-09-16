import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
  const { user, refreshUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      navigate("/login");
    } catch (err) {
      setDeleteError(extractErrorMessage(err, "Não foi possível excluir a conta."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
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

      <Card className="border-red-200 dark:border-red-900">
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Excluir conta</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Remove permanentemente sua conta e todos os seus dados financeiros. Não pode ser desfeito.
        </p>

        {!showDeleteConfirm ? (
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            Excluir minha conta
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              label="Confirme sua senha para continuar"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteAccount} isLoading={isDeleting}>
                Confirmar exclusão definitiva
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

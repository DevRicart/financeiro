import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { couplesService } from "../services/couples.service";
import { extractErrorMessage } from "../utils/errors";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  REJECTED: "Recusado",
  ENDED: "Encerrado",
};

export function PartnershipPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: partnerships, isLoading } = useQuery({ queryKey: ["partnerships"], queryFn: couplesService.list });

  const handleInvite = async () => {
    setError(null);
    try {
      await couplesService.invite(email);
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["partnerships"] });
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível enviar o convite."));
    }
  };

  const handleAccept = async (id: number) => {
    await couplesService.accept(id);
    queryClient.invalidateQueries({ queryKey: ["partnerships"] });
  };

  const handleReject = async (id: number) => {
    await couplesService.reject(id);
    queryClient.invalidateQueries({ queryKey: ["partnerships"] });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Parceiro</h1>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Convidar por e-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="flex-1"
        />
        <Button onClick={handleInvite}>Enviar convite</Button>
      </Card>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!partnerships || partnerships.length === 0) && (
        <EmptyState
          title="Nenhum vínculo ainda"
          description="Convide seu parceiro para compartilhar informações financeiras."
        />
      )}

      <div className="flex flex-col gap-3">
        {partnerships?.map((partnership) => {
          const isPendingForMe = partnership.status === "PENDING" && partnership.partner === user?.id;
          const otherPersonEmail =
            partnership.creator_email === user?.email ? partnership.partner_email : partnership.creator_email;

          return (
            <Card key={partnership.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{otherPersonEmail}</p>
                <Badge
                  tone={
                    partnership.status === "ACTIVE"
                      ? "success"
                      : partnership.status === "REJECTED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {STATUS_LABEL[partnership.status]}
                </Badge>
              </div>
              {isPendingForMe && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleAccept(partnership.id)}>
                    Aceitar
                  </Button>
                  <Button variant="ghost" onClick={() => handleReject(partnership.id)}>
                    Recusar
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

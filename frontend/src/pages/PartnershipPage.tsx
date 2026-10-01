import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Heart, X } from "lucide-react";
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

const SHARED_ITEMS = [
  { label: "Transações marcadas como compartilhadas", detail: "As demais continuam só suas.", shared: true },
  { label: "Metas criadas com o parceiro", detail: "Os dois podem guardar dinheiro na mesma meta.", shared: true },
  { label: "Saldos de contas e cartões", detail: "Nunca são mostrados para a outra pessoa.", shared: false },
];

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
      <div>
        <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Parceiro</h1>
        <p className="text-sm text-cinza dark:text-papel/60">
          Divida a vida financeira com quem mora com você, sem abrir mão da sua privacidade.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-luz/15 text-luz-escura">
            <Heart size={18} />
          </span>
          <h2 className="mb-1 font-semibold text-tinta dark:text-papel">Convide seu parceiro</h2>
          <p className="mb-4 text-sm text-cinza dark:text-papel/60">
            Enviaremos um link por e-mail. O vínculo só é criado quando a pessoa aceitar.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="flex-1"
            />
            <Button onClick={handleInvite}>Enviar convite</Button>
          </div>
          {error && <p className="mt-2 text-sm text-despesa">{error}</p>}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-tinta dark:text-papel">O que fica compartilhado</h2>
          <div className="flex flex-col divide-y divide-cinza/15 dark:divide-papel/10">
            {SHARED_ITEMS.map((item) => (
              <div key={item.label} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                    item.shared ? "bg-receita/15 text-receita" : "bg-nevoa text-cinza dark:bg-noite-borda"
                  }`}
                >
                  {item.shared ? <Check size={12} /> : <X size={12} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-tinta dark:text-papel">{item.label}</p>
                  <p className="text-xs text-cinza dark:text-papel/60">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!partnerships || partnerships.length === 0) && (
        <EmptyState
          title="Nenhum vínculo ainda"
          description="Convide seu parceiro para compartilhar informações financeiras."
        />
      )}

      {partnerships && partnerships.length > 0 && (
        <div className="flex flex-col gap-3">
          {partnerships.map((partnership) => {
            const isPendingForMe = partnership.status === "PENDING" && partnership.partner === user?.id;
            const otherPersonEmail =
              partnership.creator_email === user?.email ? partnership.partner_email : partnership.creator_email;

            return (
              <Card key={partnership.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-tinta dark:text-papel">{otherPersonEmail}</p>
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
      )}
    </div>
  );
}

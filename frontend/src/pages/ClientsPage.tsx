import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { clientsService } from "../services/clients.service";
import { extractErrorMessage } from "../utils/errors";

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients, isLoading } = useQuery({ queryKey: ["clients"], queryFn: clientsService.list });

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await clientsService.create({ display_name: displayName, email, phone });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDisplayName("");
      setEmail("");
      setPhone("");
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível cadastrar o cliente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pacientes, clientes de freelance ou qualquer pessoa que te paga por atendimento/projeto.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Novo cliente</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!clients || clients.length === 0) && (
        <EmptyState title="Nenhum cliente ainda" description="Cadastre para vincular a atendimentos e projetos." />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {clients?.map((client) => (
          <Card key={client.id}>
            <p className="font-medium text-slate-900 dark:text-slate-100">{client.display_name}</p>
            {client.email && <p className="text-sm text-slate-500 dark:text-slate-400">{client.email}</p>}
            {client.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{client.phone}</p>}
          </Card>
        ))}
      </div>

      <Modal title="Novo cliente" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <Input label="E-mail (opcional)" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Telefone (opcional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleCreate} isLoading={isSubmitting}>
            Cadastrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

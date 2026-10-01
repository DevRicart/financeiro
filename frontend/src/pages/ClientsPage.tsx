import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { clientsService } from "../services/clients.service";
import { extractErrorMessage } from "../utils/errors";

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients, isLoading } = useQuery({ queryKey: ["clients"], queryFn: clientsService.list });
  const filtered = clients?.filter((client) => client.display_name.toLowerCase().includes(search.toLowerCase()));

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Clientes</h1>
          <p className="text-sm text-cinza dark:text-papel/60">
            Pacientes, clientes de freelance ou qualquer pessoa que te paga por atendimento ou projeto.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Novo cliente</Button>
      </div>

      {clients && clients.length > 0 && (
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza/60" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente"
            className="w-full rounded-lg border border-cinza/30 bg-white py-2 pl-9 pr-3 text-sm text-tinta outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo dark:border-papel/15 dark:bg-noite-clara dark:text-papel"
          />
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!clients || clients.length === 0) && (
        <EmptyState title="Nenhum cliente ainda" description="Cadastre para vincular a atendimentos e projetos." />
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-cinza/15 dark:border-papel/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-nevoa/40 text-xs uppercase text-cinza dark:bg-noite-clara dark:text-papel/60">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cinza/15 dark:divide-papel/10">
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-nevoa font-medium text-tinta dark:bg-noite-borda dark:text-papel">
                        {client.display_name.charAt(0).toUpperCase()}
                      </span>
                      <p className="font-medium text-tinta dark:text-papel">{client.display_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cinza dark:text-papel/60">
                    {client.email || client.phone || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Novo cliente" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <Input label="E-mail (opcional)" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Telefone (opcional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
          {error && <p className="text-sm text-despesa">{error}</p>}
          <Button onClick={handleCreate} isLoading={isSubmitting}>
            Cadastrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

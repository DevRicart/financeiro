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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pacientes, clientes de freelance ou qualquer pessoa que te paga por atendimento ou projeto.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Novo cliente</Button>
      </div>

      {clients && clients.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!clients || clients.length === 0) && (
        <EmptyState title="Nenhum cliente ainda" description="Cadastre para vincular a atendimentos e projetos." />
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {client.display_name.charAt(0).toUpperCase()}
                      </span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{client.display_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleCreate} isLoading={isSubmitting}>
            Cadastrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

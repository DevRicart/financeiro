import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Select } from "../components/ui/Select";
import { bankService } from "../services/bank.service";
import { categoriesService } from "../services/categories.service";
import type { Category } from "../types/category";
import type { ImportedTransaction } from "../types/bank";
import { formatCurrency } from "../utils/currency";
import { formatDate } from "../utils/dates";

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connectionsQuery = useQuery({ queryKey: ["bank-connections"], queryFn: bankService.listConnections });
  const importsQuery = useQuery({ queryKey: ["bank-imports"], queryFn: () => bankService.listPendingImports() });
  const incomeCategoriesQuery = useQuery({
    queryKey: ["categories", "INCOME"],
    queryFn: () => categoriesService.list("INCOME"),
  });
  const expenseCategoriesQuery = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => categoriesService.list("EXPENSE"),
  });

  const categories = useMemo(
    () => [...(incomeCategoriesQuery.data ?? []), ...(expenseCategoriesQuery.data ?? [])],
    [incomeCategoriesQuery.data, expenseCategoriesQuery.data],
  );

  const handleConnectBank = async () => {
    setConnectError(null);
    try {
      const token = await bankService.createConnectToken();
      setConnectToken(token);
    } catch {
      setConnectError(
        "Não foi possível iniciar a conexão. Verifique se PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET estão configurados no backend (.env).",
      );
    }
  };

  // NOTA: o formato exato do payload que `onSuccess` recebe não pôde ser
  // confirmado na documentação pública da Pluggy no momento em que este
  // código foi escrito — confira em https://docs.pluggy.ai quando tiver
  // credenciais reais e ajuste a extração do itemId se necessário.
  const handleWidgetSuccess = async (itemData: { item?: { id?: string }; itemId?: string; id?: string }) => {
    const itemId = itemData?.item?.id ?? itemData?.itemId ?? itemData?.id;
    setConnectToken(null);
    if (!itemId) return;
    await bankService.registerConnection(itemId);
    queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
    queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
  };

  const handleSync = async (connectionId: number) => {
    await bankService.syncConnection(connectionId);
    queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
    queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Importações (Open Finance)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Conecte seus bancos e organize cada movimentação importada com a categoria e descrição corretas.
          </p>
        </div>
        <Button onClick={handleConnectBank}>+ Conectar banco</Button>
      </div>

      {connectError && <p className="text-sm text-red-600">{connectError}</p>}

      {connectionsQuery.data && connectionsQuery.data.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {connectionsQuery.data.map((connection) => (
            <Card key={connection.id} className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {connection.institution_name || "Conexão bancária"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Última sincronização:{" "}
                  {connection.last_synced_at ? formatDate(connection.last_synced_at.slice(0, 10)) : "nunca"}
                </p>
              </div>
              <Badge
                tone={
                  connection.status === "UPDATED"
                    ? "success"
                    : connection.status === "ERROR" || connection.status === "LOGIN_ERROR"
                      ? "danger"
                      : "warning"
                }
              >
                {connection.status}
              </Badge>
              <Button variant="secondary" onClick={() => handleSync(connection.id)}>
                Sincronizar
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Aguardando revisão</h2>

        {importsQuery.isLoading && <LoadingSpinner />}

        {!importsQuery.isLoading && (!importsQuery.data || importsQuery.data.results.length === 0) && (
          <EmptyState
            title="Nada para revisar"
            description="Assim que novas movimentações forem importadas do seu banco, elas aparecem aqui para você confirmar a categoria."
          />
        )}

        <div className="flex flex-col gap-3">
          {importsQuery.data?.results.map((item) => (
            <ImportRow key={item.id} item={item} categories={categories} />
          ))}
        </div>
      </div>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={handleWidgetSuccess}
          onClose={() => setConnectToken(null)}
        />
      )}
    </div>
  );
}

function ImportRow({ item, categories }: { item: ImportedTransaction; categories: Category[] }) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(item.suggested_category ? String(item.suggested_category) : "");
  const [title, setTitle] = useState(item.description);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpense = Number(item.amount) < 0;

  const handleConfirm = async () => {
    if (!categoryId) return;
    setIsSubmitting(true);
    try {
      await bankService.confirmImport(item.id, { category: Number(categoryId), title });
      queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = async () => {
    await bankService.ignoreImport(item.id);
    queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
  };

  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="md:w-40">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatDate(item.date)} · {item.account_name}
        </p>
        <p className={`text-lg font-semibold ${isExpense ? "text-red-600" : "text-green-600"}`}>
          {formatCurrency(item.amount)}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="flex-1" />
        <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="flex-1">
          <option value="" disabled>
            Categoria...
          </option>
          {categories
            .filter((category) => category.category_type === (isExpense ? "EXPENSE" : "INCOME"))
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={handleIgnore}>
          Ignorar
        </Button>
        <Button onClick={handleConfirm} isLoading={isSubmitting} disabled={!categoryId}>
          Confirmar
        </Button>
      </div>
    </Card>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Select } from "../components/ui/Select";
import { bankService } from "../services/bank.service";
import { categoriesService } from "../services/categories.service";
import { transactionsService } from "../services/transactions.service";
import type { Category } from "../types/category";
import type { ImportedTransaction } from "../types/bank";
import { formatCurrency } from "../utils/currency";
import { formatDate } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

export function ImportsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [categoryChoices, setCategoryChoices] = useState<Record<number, string>>({});
  const [titleChoices, setTitleChoices] = useState<Record<number, string>>({});
  const [isBulkActing, setIsBulkActing] = useState(false);

  const accountsQuery = useQuery({ queryKey: ["financial-accounts"], queryFn: transactionsService.listAccounts });
  const historyQuery = useQuery({ queryKey: ["bank-import-history"], queryFn: bankService.listImportHistory });
  const importsQuery = useQuery({ queryKey: ["bank-imports"], queryFn: () => bankService.listPendingImports() });
  const incomeCategoriesQuery = useQuery({
    queryKey: ["categories", "INCOME"],
    queryFn: () => categoriesService.list("INCOME"),
  });
  const expenseCategoriesQuery = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => categoriesService.list("EXPENSE"),
  });

  const categories = [...(incomeCategoriesQuery.data ?? []), ...(expenseCategoriesQuery.data ?? [])];
  const items = importsQuery.data?.results ?? [];

  // Preenche os mapas de categoria/descrição escolhidas com a sugestão
  // automática assim que cada item chega, sem sobrescrever o que o usuário
  // já tiver ajustado manualmente.
  useEffect(() => {
    setCategoryChoices((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of items) {
        if (!(item.id in next)) {
          next[item.id] = item.suggested_category ? String(item.suggested_category) : "";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setTitleChoices((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of items) {
        if (!(item.id in next)) {
          next[item.id] = item.description;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importsQuery.data]);

  const invalidateImportQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const allIds = items.map((item) => item.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const selectedWithCategory = Array.from(selectedIds).filter((id) => categoryChoices[id]);

  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(allIds));
  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (selectedWithCategory.length === 0) return;
    setIsBulkActing(true);
    try {
      await Promise.all(
        selectedWithCategory.map((id) =>
          bankService.confirmImport(id, { category: Number(categoryChoices[id]), title: titleChoices[id] || "" }),
        ),
      );
      setSelectedIds(new Set());
      invalidateImportQueries();
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleBulkIgnore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkActing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => bankService.ignoreImport(id)));
      setSelectedIds(new Set());
      invalidateImportQueries();
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploadError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!accountId || !file) {
      setUploadError("Selecione a conta e o arquivo.");
      return;
    }

    setIsUploading(true);
    try {
      await bankService.uploadStatement(Number(accountId), file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["bank-import-history"] });
      queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
    } catch (error) {
      setUploadError(extractErrorMessage(error, "Não foi possível importar esse arquivo."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Importar extrato</h1>
        <p className="text-sm text-cinza dark:text-papel/60">
          Exporte o extrato do seu banco (OFX — a maioria dos bancos — ou CSV do PicPay) e envie aqui —
          organize a categoria e descrição de cada movimentação antes dela virar uma transação real.
        </p>
      </div>

      <Card>
        <form onSubmit={handleUpload} className="flex flex-col gap-4 md:flex-row md:items-end">
          <Select
            label="Conta"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="md:w-56"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {accountsQuery.data?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.qfx,.csv"
            label="Arquivo (OFX ou CSV)"
            className="flex-1"
          />
          <Button type="submit" isLoading={isUploading}>
            Importar
          </Button>
        </form>
        {uploadError && <p className="mt-2 text-sm text-despesa">{uploadError}</p>}
        {(!accountsQuery.data || accountsQuery.data.length === 0) && !accountsQuery.isLoading && (
          <p className="mt-2 text-sm text-cinza dark:text-papel/60">
            Cadastre uma conta financeira antes de importar um extrato.
          </p>
        )}
      </Card>

      {historyQuery.data && historyQuery.data.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-tinta dark:text-papel">Importações recentes</h2>
          <div className="flex flex-wrap gap-3">
            {historyQuery.data.map((item) => (
              <Card key={item.id} className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-tinta dark:text-papel">
                    {item.file_name || "extrato.ofx"} · {item.account_name}
                  </p>
                  <p className="text-xs text-cinza dark:text-papel/60">
                    {formatDate(item.imported_at.slice(0, 10))} · {item.transaction_count} lançamento(s)
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-tinta dark:text-papel">
            Aguardando revisão {items.length > 0 && `· ${items.length} movimentação(ões)`}
          </h2>
          {items.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-cinza dark:text-papel/60">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              Selecionar todas
            </label>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-cinza/15 bg-nevoa/40 px-4 py-2 dark:border-papel/10 dark:bg-noite-clara">
            <span className="text-sm text-cinza dark:text-papel/70">
              {selectedIds.size} selecionada(s)
              {selectedWithCategory.length < selectedIds.size &&
                ` · ${selectedIds.size - selectedWithCategory.length} sem categoria`}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleBulkIgnore} isLoading={isBulkActing}>
                Ignorar selecionadas
              </Button>
              <Button onClick={handleBulkConfirm} isLoading={isBulkActing} disabled={selectedWithCategory.length === 0}>
                Confirmar {selectedWithCategory.length || ""} selecionada(s)
              </Button>
            </div>
          </div>
        )}

        {importsQuery.isLoading && <LoadingSpinner />}

        {!importsQuery.isLoading && items.length === 0 && (
          <EmptyState
            title="Nada para revisar"
            description="Assim que você importar um extrato, as movimentações aparecem aqui para você confirmar a categoria."
          />
        )}

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ImportRow
              key={item.id}
              item={item}
              categories={categories}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelected(item.id)}
              categoryId={categoryChoices[item.id] ?? ""}
              onCategoryChange={(value) => setCategoryChoices((prev) => ({ ...prev, [item.id]: value }))}
              title={titleChoices[item.id] ?? item.description}
              onTitleChange={(value) => setTitleChoices((prev) => ({ ...prev, [item.id]: value }))}
              onDone={invalidateImportQueries}
            />
          ))}
        </div>

        {items.length > 0 && (
          <p className="mt-3 text-xs text-cinza/70 dark:text-papel/40">
            Escolha uma categoria para liberar o botão Confirmar.
          </p>
        )}
      </div>
    </div>
  );
}

function ImportRow({
  item,
  categories,
  selected,
  onToggleSelect,
  categoryId,
  onCategoryChange,
  title,
  onTitleChange,
  onDone,
}: {
  item: ImportedTransaction;
  categories: Category[];
  selected: boolean;
  onToggleSelect: () => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  onDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isExpense = Number(item.amount) < 0;

  const handleConfirm = async () => {
    if (!categoryId) return;
    setIsSubmitting(true);
    try {
      await bankService.confirmImport(item.id, { category: Number(categoryId), title });
      onDone();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = async () => {
    await bankService.ignoreImport(item.id);
    onDone();
  };

  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <input type="checkbox" checked={selected} onChange={onToggleSelect} className="md:mr-1" />

      <div className="md:w-40">
        <p className="text-xs text-cinza dark:text-papel/60">
          {formatDate(item.date)} · {item.account_name}
        </p>
        <p className={`text-lg font-semibold ${isExpense ? "text-despesa" : "text-receita"}`}>
          {formatCurrency(item.amount)}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        <Input value={title} onChange={(event) => onTitleChange(event.target.value)} className="flex-1" />
        <Select value={categoryId} onChange={(event) => onCategoryChange(event.target.value)} className="flex-1">
          <option value="" disabled>
            Escolher categoria
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
        <Button onClick={handleConfirm} isLoading={isSubmitting} disabled={!categoryId} title={!categoryId ? "Escolha uma categoria para confirmar" : undefined}>
          Confirmar
        </Button>
      </div>
    </Card>
  );
}

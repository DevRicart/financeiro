import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard as CreditCardIcon, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { BANKS, getBankColor } from "../constants/banks";
import { creditCardsService } from "../services/credit-cards.service";
import type { CreditCard } from "../types/transaction";
import { formatCurrency } from "../utils/currency";
import { currentMonthValue, formatDate, formatMonthLabel, todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const EMPTY_FORM = { name: "", institution: BANKS[0].value, closing_day: "10", due_day: "17" };

export function CreditCardsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(currentMonthValue());
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cards, isLoading } = useQuery({ queryKey: ["credit-cards"], queryFn: creditCardsService.list });

  const activeCardId = selectedCardId ?? cards?.[0]?.id ?? null;

  const invoiceQuery = useQuery({
    queryKey: ["credit-card-invoice", activeCardId, month],
    queryFn: () => creditCardsService.getInvoice(activeCardId as number, month),
    enabled: activeCardId !== null,
  });

  const openCreateModal = () => {
    setEditingCardId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCardId(card.id);
    setForm({
      name: card.name,
      institution: card.institution,
      closing_day: String(card.closing_day),
      due_day: String(card.due_day),
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSaveCard = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        institution: form.institution,
        closing_day: Number(form.closing_day),
        due_day: Number(form.due_day),
      };
      if (editingCardId) {
        await creditCardsService.update(editingCardId, payload);
      } else {
        await creditCardsService.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível salvar o cartão."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async (card: CreditCard) => {
    if (!confirm(`Excluir o cartão "${card.name}"? As compras já lançadas não serão apagadas.`)) return;
    await creditCardsService.remove(card.id);
    if (selectedCardId === card.id) setSelectedCardId(null);
    queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
  };

  const handlePayInvoice = async () => {
    if (activeCardId === null) return;
    await creditCardsService.payInvoice(activeCardId, { month, payment_date: todayValue() });
    queryClient.invalidateQueries({ queryKey: ["credit-card-invoice", activeCardId, month] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const selectedCard = cards?.find((c) => c.id === activeCardId);
  const limit = selectedCard?.credit_limit ? Number(selectedCard.credit_limit) : null;
  const used = invoiceQuery.data?.total ? Number(invoiceQuery.data.total) : 0;
  const usedPercentage = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Cartões de crédito</h1>
          <p className="text-sm text-cinza dark:text-papel/60">Compras no cartão entram na fatura pelo dia de fechamento.</p>
        </div>
        <Button onClick={openCreateModal}>+ Novo cartão</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!cards || cards.length === 0) && (
        <EmptyState title="Nenhum cartão cadastrado" description="Cadastre um cartão para lançar compras nele." />
      )}

      {cards && cards.length > 0 && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-shrink-0 flex-col gap-3">
            {cards.map((card) => (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCardId(card.id)}
                onKeyDown={(event) => event.key === "Enter" && setSelectedCardId(card.id)}
                style={{ backgroundColor: getBankColor(card.institution) }}
                className={`group relative flex h-40 w-64 cursor-pointer flex-col justify-between rounded-2xl p-5 text-left text-white shadow-sm transition-transform ${
                  activeCardId === card.id ? "ring-2 ring-offset-2 ring-petroleo dark:ring-offset-noite" : ""
                }`}
              >
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label="Editar cartão"
                    title="Editar cartão"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditModal(card);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 text-white hover:bg-black/40"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir cartão"
                    title="Excluir cartão"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteCard(card);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 text-white hover:bg-despesa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <span className="text-lg font-medium">{card.name}</span>
                <CreditCardIcon size={22} className="opacity-80" />
                <span className="flex justify-between text-xs opacity-80">
                  <span>Fecha dia {card.closing_day}</span>
                  <span>Vence dia {card.due_day}</span>
                </span>
              </div>
            ))}
          </div>

          {selectedCard && (
            <Card className="flex-1">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-tinta dark:text-papel">Fatura de {formatMonthLabel(month)}</h2>
                  <Badge tone="neutral">Aberta</Badge>
                </div>
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="rounded-lg border border-cinza/30 px-3 py-2 text-sm dark:border-papel/15 dark:bg-noite-clara dark:text-papel"
                />
              </div>

              {invoiceQuery.isLoading && <LoadingSpinner />}

              {invoiceQuery.data && (
                <>
                  <div className="flex flex-wrap gap-10">
                    <div>
                      <p className="text-sm text-cinza dark:text-papel/60">Valor atual</p>
                      <p className="font-serif text-3xl font-medium text-tinta dark:text-papel">
                        {formatCurrency(invoiceQuery.data.total)}
                      </p>
                    </div>
                  </div>

                  {limit && (
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-cinza dark:text-papel/60">
                        <span>Limite usado</span>
                        <span>
                          {formatCurrency(used)} de {formatCurrency(limit)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-nevoa dark:bg-noite-borda">
                        <div
                          className="h-full rounded-full bg-petroleo"
                          style={{ width: `${usedPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {invoiceQuery.data.total > 0 && <Button onClick={handlePayInvoice}>Pagar fatura</Button>}
                  </div>

                  <div className="mt-4 border-t border-cinza/15 pt-4 dark:border-papel/10">
                    {invoiceQuery.data.purchases.length === 0 ? (
                      <p className="text-sm text-cinza dark:text-papel/60">Nenhuma compra nesta fatura.</p>
                    ) : (
                      <ul className="divide-y divide-cinza/15 dark:divide-papel/10">
                        {invoiceQuery.data.purchases.map((purchase) => (
                          <li key={purchase.id} className="flex justify-between py-2 text-sm">
                            <span>
                              {formatDate(purchase.purchase_date)} · {purchase.transaction_title}
                            </span>
                            <span className="font-medium">{formatCurrency(purchase.transaction_amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      <Modal title={editingCardId ? "Editar cartão" : "Novo cartão"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select
            label="Instituição"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          >
            {BANKS.map((bank) => (
              <option key={bank.value} value={bank.value}>
                {bank.label}
              </option>
            ))}
          </Select>
          <Input
            label="Dia de fechamento"
            type="number"
            min={1}
            max={31}
            value={form.closing_day}
            onChange={(e) => setForm({ ...form, closing_day: e.target.value })}
          />
          <Input
            label="Dia de vencimento"
            type="number"
            min={1}
            max={31}
            value={form.due_day}
            onChange={(e) => setForm({ ...form, due_day: e.target.value })}
          />
          {error && <p className="text-sm text-despesa">{error}</p>}
          <Button onClick={handleSaveCard} isLoading={isSubmitting}>
            {editingCardId ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

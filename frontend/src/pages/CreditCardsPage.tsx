import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { creditCardsService } from "../services/credit-cards.service";
import { formatCurrency } from "../utils/currency";
import { currentMonthValue, formatDate, todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

export function CreditCardsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(currentMonthValue());
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", institution: "", closing_day: "10", due_day: "17" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cards, isLoading } = useQuery({ queryKey: ["credit-cards"], queryFn: creditCardsService.list });

  const invoiceQuery = useQuery({
    queryKey: ["credit-card-invoice", selectedCardId, month],
    queryFn: () => creditCardsService.getInvoice(selectedCardId as number, month),
    enabled: selectedCardId !== null,
  });

  const handleCreateCard = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await creditCardsService.create({
        name: form.name,
        institution: form.institution,
        closing_day: Number(form.closing_day),
        due_day: Number(form.due_day),
      });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      setForm({ name: "", institution: "", closing_day: "10", due_day: "17" });
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível cadastrar o cartão."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInvoice = async () => {
    if (selectedCardId === null) return;
    await creditCardsService.payInvoice(selectedCardId, { month, payment_date: todayValue() });
    queryClient.invalidateQueries({ queryKey: ["credit-card-invoice", selectedCardId, month] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const selectedCard = cards?.find((c) => c.id === selectedCardId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cartões de crédito</h1>
        <Button onClick={() => setModalOpen(true)}>+ Novo cartão</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!cards || cards.length === 0) && (
        <EmptyState title="Nenhum cartão cadastrado" description="Cadastre um cartão para lançar compras nele." />
      )}

      <div className="flex flex-wrap gap-3">
        {cards?.map((card) => (
          <Card
            key={card.id}
            className={`w-56 cursor-pointer ${selectedCardId === card.id ? "ring-2 ring-slate-900 dark:ring-slate-100" : ""}`}
            onClick={() => setSelectedCardId(card.id)}
          >
            <p className="font-medium text-slate-900 dark:text-slate-100">{card.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.institution}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Fecha dia {card.closing_day} · Vence dia {card.due_day}
            </p>
          </Card>
        ))}
      </div>

      {selectedCard && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Fatura — {selectedCard.name}</h2>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              {invoiceQuery.data && invoiceQuery.data.total > 0 && (
                <Button onClick={handlePayInvoice}>Pagar fatura</Button>
              )}
            </div>
          </div>

          {invoiceQuery.isLoading && <LoadingSpinner />}

          {invoiceQuery.data && (
            <>
              <p className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Total: {formatCurrency(invoiceQuery.data.total)}
              </p>
              {invoiceQuery.data.purchases.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma compra nesta fatura.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
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
            </>
          )}
        </Card>
      )}

      <Modal title="Novo cartão" isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Instituição"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          />
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleCreateCard} isLoading={isSubmitting}>
            Cadastrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

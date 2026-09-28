import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard as CreditCardIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { creditCardsService } from "../services/credit-cards.service";
import { formatCurrency } from "../utils/currency";
import { currentMonthValue, formatDate, formatMonthLabel, todayValue } from "../utils/dates";
import { extractErrorMessage } from "../utils/errors";

const CARD_COLORS = ["bg-purple-700", "bg-slate-800", "bg-emerald-700", "bg-blue-700", "bg-rose-700"];

export function CreditCardsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(currentMonthValue());
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", institution: "", closing_day: "10", due_day: "17" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cards, isLoading } = useQuery({ queryKey: ["credit-cards"], queryFn: creditCardsService.list });

  const activeCardId = selectedCardId ?? cards?.[0]?.id ?? null;

  const invoiceQuery = useQuery({
    queryKey: ["credit-card-invoice", activeCardId, month],
    queryFn: () => creditCardsService.getInvoice(activeCardId as number, month),
    enabled: activeCardId !== null,
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
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Cartões de crédito</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Compras no cartão entram na fatura pelo dia de fechamento.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Novo cartão</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!cards || cards.length === 0) && (
        <EmptyState title="Nenhum cartão cadastrado" description="Cadastre um cartão para lançar compras nele." />
      )}

      {cards && cards.length > 0 && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-shrink-0 flex-col gap-3">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCardId(card.id)}
                className={`flex h-40 w-64 flex-col justify-between rounded-2xl p-5 text-left text-white shadow-sm transition-transform ${
                  CARD_COLORS[index % CARD_COLORS.length]
                } ${activeCardId === card.id ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-offset-slate-950" : ""}`}
              >
                <span className="text-lg font-medium">{card.name}</span>
                <CreditCardIcon size={22} className="opacity-80" />
                <span className="flex justify-between text-xs opacity-80">
                  <span>Fecha dia {card.closing_day}</span>
                  <span>Vence dia {card.due_day}</span>
                </span>
              </button>
            ))}
          </div>

          {selectedCard && (
            <Card className="flex-1">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Fatura de {formatMonthLabel(month)}</h2>
                  <Badge tone="neutral">Aberta</Badge>
                </div>
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              {invoiceQuery.isLoading && <LoadingSpinner />}

              {invoiceQuery.data && (
                <>
                  <div className="flex flex-wrap gap-10">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Valor atual</p>
                      <p className="font-serif text-3xl font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(invoiceQuery.data.total)}
                      </p>
                    </div>
                  </div>

                  {limit && (
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Limite usado</span>
                        <span>
                          {formatCurrency(used)} de {formatCurrency(limit)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-slate-800 dark:bg-slate-100"
                          style={{ width: `${usedPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {invoiceQuery.data.total > 0 && <Button onClick={handlePayInvoice}>Pagar fatura</Button>}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
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
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
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

export function formatCurrency(value: number | string, currency = "BRL") {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(numeric || 0);
}

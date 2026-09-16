export function formatCurrency(value: number | string, currency = "BRL") {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(numeric || 0);
}

/**
 * Converts a pt-BR formatted amount (e.g. "1.234,56", typed into a plain
 * text input) into the plain decimal string the API expects ("1234.56").
 *
 * A naive `value.replace(",", ".")` only swaps the decimal separator and
 * leaves any "." thousands separator in place, producing an unparseable
 * string like "1.234.56" for anything over a thousand reais.
 */
export function parseCurrencyInput(value: string): string {
  return value.replace(/\./g, "").replace(",", ".");
}

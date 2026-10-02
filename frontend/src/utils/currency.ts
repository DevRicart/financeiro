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

/**
 * Cleans what the user types into a money field: pt-BR comma as the decimal
 * mark, at most two decimal places, no letters or stray symbols.
 *
 * Many phone keypads (Android in English, iOS with a non-Brazil region) only
 * offer "." as the decimal key, so a lone "." is taken as the decimal mark and
 * shown as ",". Dots next to a comma, or several dots in a row, are thousands
 * separators (a pasted "1.234,56") and are dropped.
 */
export function sanitizeCurrencyInput(raw: string, { allowNegative = false } = {}): string {
  const isNegative = allowNegative && raw.trimStart().startsWith("-");
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const dotCount = cleaned.split(".").length - 1;

  let integerPart: string;
  let decimalPart: string | null = null;

  if (cleaned.includes(",")) {
    const [first, ...rest] = cleaned.split(",");
    integerPart = first.replace(/\./g, "");
    decimalPart = rest.join("").replace(/\./g, "");
  } else if (dotCount === 1) {
    [integerPart, decimalPart] = cleaned.split(".");
  } else {
    integerPart = cleaned.replace(/\./g, "");
  }

  if (decimalPart !== null && integerPart === "") integerPart = "0";

  const sign = isNegative ? "-" : "";
  return decimalPart === null ? `${sign}${integerPart}` : `${sign}${integerPart},${decimalPart.slice(0, 2)}`;
}

/**
 * Inverse of parseCurrencyInput — converts the API's plain decimal string
 * ("1234.56") into a pt-BR editable value ("1234,56"), for prefilling a form
 * field the user might submit again untouched.
 */
export function formatCurrencyInput(value: string): string {
  return value.replace(".", ",");
}

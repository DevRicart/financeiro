import { describe, expect, it } from "vitest";
import { formatCurrency, parseCurrencyInput, sanitizeCurrencyInput } from "./currency";

// Intl.NumberFormat inserts a non-breaking space (U+00A0) between "R$" and
// the number — correct, but easy to misspell as a regular space in a test
// expectation and get a confusing byte-for-byte mismatch. Normalize instead
// of hardcoding a specific invisible character that could vary by ICU build.
function normalizeSpaces(value: string) {
  return value.replace(/\s/g, " ");
}

describe("formatCurrency", () => {
  it("formats a positive number as BRL", () => {
    expect(normalizeSpaces(formatCurrency(1234.5))).toBe("R$ 1.234,50");
  });

  it("formats a numeric string", () => {
    expect(normalizeSpaces(formatCurrency("99.9"))).toBe("R$ 99,90");
  });

  it("formats zero", () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe("R$ 0,00");
  });

  it("formats a negative value with the minus sign", () => {
    expect(normalizeSpaces(formatCurrency(-50))).toBe("-R$ 50,00");
  });

  it("falls back to zero for an empty/invalid string", () => {
    expect(normalizeSpaces(formatCurrency(""))).toBe("R$ 0,00");
  });

  it("supports a different currency code", () => {
    expect(formatCurrency(10, "USD")).toContain("10,00");
  });
});

describe("parseCurrencyInput", () => {
  it("converts a simple comma-decimal amount", () => {
    expect(parseCurrencyInput("150,00")).toBe("150.00");
  });

  it("strips the thousands separator before swapping the decimal comma", () => {
    // A naive `.replace(",", ".")` turns this into the unparseable
    // "1.234.56" — this is exactly the regression this function exists to
    // prevent for any amount at or above one thousand reais.
    expect(parseCurrencyInput("1.234,56")).toBe("1234.56");
  });

  it("handles multiple thousands separators", () => {
    expect(parseCurrencyInput("1.234.567,89")).toBe("1234567.89");
  });

  it("handles a whole number with no decimal part", () => {
    expect(parseCurrencyInput("500")).toBe("500");
  });

  it("round-trips back into a valid positive Number", () => {
    expect(Number(parseCurrencyInput("1.234,56"))).toBeCloseTo(1234.56);
  });
});

describe("sanitizeCurrencyInput", () => {
  it("keeps a comma-decimal amount as typed", () => {
    expect(sanitizeCurrencyInput("12,50")).toBe("12,50");
  });

  it("keeps a trailing comma so the user can keep typing the decimals", () => {
    expect(sanitizeCurrencyInput("12,")).toBe("12,");
  });

  it("turns a lone dot into the decimal comma (keypads without a comma key)", () => {
    expect(sanitizeCurrencyInput("12.5")).toBe("12,5");
    expect(sanitizeCurrencyInput("12.50")).toBe("12,50");
  });

  it("blocks a third decimal place", () => {
    expect(sanitizeCurrencyInput("12,505")).toBe("12,50");
    expect(sanitizeCurrencyInput("12.505")).toBe("12,50");
  });

  it("accepts only one decimal separator", () => {
    expect(sanitizeCurrencyInput("12,3,4")).toBe("12,34");
    expect(sanitizeCurrencyInput("12,5.")).toBe("12,5");
  });

  it("drops thousands separators from a pasted formatted amount", () => {
    expect(sanitizeCurrencyInput("1.234,56")).toBe("1234,56");
    expect(sanitizeCurrencyInput("1.234.567")).toBe("1234567");
    expect(sanitizeCurrencyInput("R$ 1.234,56")).toBe("1234,56");
  });

  it("strips letters and symbols", () => {
    expect(sanitizeCurrencyInput("abc12x")).toBe("12");
    expect(sanitizeCurrencyInput("")).toBe("");
  });

  it("prefixes a zero when the amount starts with the separator", () => {
    expect(sanitizeCurrencyInput(",5")).toBe("0,5");
    expect(sanitizeCurrencyInput(".5")).toBe("0,5");
  });

  it("strips a minus sign unless negative values are allowed", () => {
    expect(sanitizeCurrencyInput("-5,5")).toBe("5,5");
    expect(sanitizeCurrencyInput("-5,5", { allowNegative: true })).toBe("-5,5");
  });

  it("produces a value parseCurrencyInput turns into a valid API decimal", () => {
    expect(parseCurrencyInput(sanitizeCurrencyInput("1.234,56"))).toBe("1234.56");
    expect(parseCurrencyInput(sanitizeCurrencyInput("12.5"))).toBe("12.5");
  });
});

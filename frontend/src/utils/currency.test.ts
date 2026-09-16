import { describe, expect, it } from "vitest";
import { formatCurrency, parseCurrencyInput } from "./currency";

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

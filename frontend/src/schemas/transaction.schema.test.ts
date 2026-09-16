import { describe, expect, it } from "vitest";
import { transactionSchema } from "./transaction.schema";

const validBase = {
  transaction_type: "EXPENSE" as const,
  category: "3",
  title: "Mercado do mês",
  total_amount: "150,00",
  competence_date: "2026-09-16",
};

describe("transactionSchema", () => {
  it("accepts a minimal valid expense", () => {
    const result = transactionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("coerces the category id from a string to a number", () => {
    const result = transactionSchema.safeParse(validBase);
    expect(result.success && result.data.category).toBe(3);
  });

  it("accepts a comma-decimal amount", () => {
    const result = transactionSchema.safeParse({ ...validBase, total_amount: "1.234,56" });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount", () => {
    const result = transactionSchema.safeParse({ ...validBase, total_amount: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = transactionSchema.safeParse({ ...validBase, total_amount: "-10" });
    expect(result.success).toBe(false);
  });

  it("rejects a blank title", () => {
    const result = transactionSchema.safeParse({ ...validBase, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects category 0 (not selected — the placeholder option)", () => {
    const result = transactionSchema.safeParse({ ...validBase, category: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown transaction_type", () => {
    const result = transactionSchema.safeParse({ ...validBase, transaction_type: "TRANSFER" });
    expect(result.success).toBe(false);
  });

  it("does not require any of the income-detail or credit-card fields", () => {
    const result = transactionSchema.safeParse({ ...validBase, transaction_type: "INCOME" });
    expect(result.success).toBe(true);
  });
});

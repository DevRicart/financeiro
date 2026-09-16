import { describe, expect, it } from "vitest";
import { debtSchema } from "./debt.schema";

const base = {
  reason: "Empréstimo",
  direction: "PAYABLE" as const,
  total_amount: "100,00",
};

describe("debtSchema", () => {
  it("accepts a free-typed person_name with no client", () => {
    const result = debtSchema.safeParse({ ...base, person_name: "Maria" });
    expect(result.success).toBe(true);
  });

  it("accepts a client id with no person_name", () => {
    const result = debtSchema.safeParse({ ...base, client: "4" });
    expect(result.success).toBe(true);
  });

  it("rejects when neither client nor person_name is given", () => {
    const result = debtSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["person_name"]);
    }
  });

  it("rejects a person_name that is only whitespace", () => {
    const result = debtSchema.safeParse({ ...base, person_name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects client id 0 (falsy — treated as not selected)", () => {
    const result = debtSchema.safeParse({ ...base, client: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing reason", () => {
    const result = debtSchema.safeParse({ ...base, reason: "", person_name: "Maria" });
    expect(result.success).toBe(false);
  });

  it("rejects a zero total_amount even with a valid name", () => {
    const result = debtSchema.safeParse({ ...base, person_name: "Maria", total_amount: "0" });
    expect(result.success).toBe(false);
  });
});

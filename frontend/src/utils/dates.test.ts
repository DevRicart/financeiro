import { describe, expect, it } from "vitest";
import { currentMonthValue, formatDate, todayValue } from "./dates";

describe("formatDate", () => {
  it("converts an ISO date to dd/mm/yyyy", () => {
    expect(formatDate("2026-09-16")).toBe("16/09/2026");
  });

  it("returns an empty string for an empty input", () => {
    expect(formatDate("")).toBe("");
  });
});

describe("currentMonthValue", () => {
  it("returns a YYYY-MM string matching the real current date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(currentMonthValue()).toBe(expected);
  });
});

describe("todayValue", () => {
  it("returns a YYYY-MM-DD string matching the real current date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayValue()).toBe(expected);
  });

  it("is parseable and round-trips through formatDate", () => {
    expect(formatDate(todayValue())).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth.schema";

describe("loginSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    expect(loginSchema.safeParse({ email: "ana@example.com", password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "ana@example.com", password: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    preferred_name: "Ana",
    email: "ana@example.com",
    password: "SenhaForte123",
    confirm_password: "SenhaForte123",
  };

  it("accepts matching passwords", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched passwords, flagging confirm_password", () => {
    const result = registerSchema.safeParse({ ...valid, confirm_password: "Outra123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirm_password"]);
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "abc", confirm_password: "abc" }).success).toBe(false);
  });

  it("rejects a blank preferred_name", () => {
    expect(registerSchema.safeParse({ ...valid, preferred_name: "" }).success).toBe(false);
  });
});

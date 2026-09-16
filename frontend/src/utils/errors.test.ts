import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { extractErrorMessage } from "./errors";

function makeAxiosError(data: unknown): AxiosError {
  const response = { data, status: 400, statusText: "Bad Request", headers: {}, config: {} } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, response);
}

describe("extractErrorMessage", () => {
  it("returns the fallback for a non-Axios error", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("Algo deu errado. Tente novamente.");
  });

  it("accepts a custom fallback", () => {
    expect(extractErrorMessage("not an error", "Falhou")).toBe("Falhou");
  });

  it("returns a plain string response body as-is", () => {
    expect(extractErrorMessage(makeAxiosError("Erro interno"))).toBe("Erro interno");
  });

  it("prefers the first field validation error array", () => {
    expect(extractErrorMessage(makeAxiosError({ email: ["Este campo é obrigatório."] }))).toBe(
      "Este campo é obrigatório.",
    );
  });

  it("falls back to `detail` when the response is a simple message object", () => {
    expect(extractErrorMessage(makeAxiosError({ detail: "Não encontrado." }))).toBe("Não encontrado.");
  });

  it("uses the fallback when the response body has no usable shape", () => {
    expect(extractErrorMessage(makeAxiosError({}))).toBe("Algo deu errado. Tente novamente.");
  });

  it("uses the fallback when there is no response at all (network error)", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK");
    expect(extractErrorMessage(error)).toBe("Algo deu errado. Tente novamente.");
  });
});

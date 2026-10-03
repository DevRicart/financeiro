import { AxiosError } from "axios";

/** The machine-readable `code` the API attaches to some errors (e.g. "email_not_verified"). */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof AxiosError && error.response?.data && typeof error.response.data === "object") {
    const code = (error.response.data as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function extractErrorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const firstValue = Object.values(data)[0];
      if (Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
      if (data.detail) return String(data.detail);
    }
  }
  return fallback;
}

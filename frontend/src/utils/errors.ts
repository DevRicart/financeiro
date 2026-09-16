import { AxiosError } from "axios";

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

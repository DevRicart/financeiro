export interface Bank {
  value: string;
  label: string;
  color: string;
}

export const BANKS: Bank[] = [
  { value: "Nubank", label: "Nubank", color: "#8A05BE" },
  { value: "PicPay", label: "PicPay", color: "#21C25E" },
  { value: "Santander", label: "Santander", color: "#EC0000" },
  { value: "Itaú", label: "Itaú", color: "#EC7000" },
  { value: "C6 Bank", label: "C6 Bank", color: "#000000" },
];

const FALLBACK_COLOR = "#475569";

export function getBankColor(institution: string | undefined | null): string {
  return BANKS.find((bank) => bank.value === institution)?.color ?? FALLBACK_COLOR;
}

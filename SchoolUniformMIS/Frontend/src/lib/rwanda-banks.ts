export const RWANDA_BANKS = [
  "Bank of Kigali Plc",
  "BPR Bank Rwanda Plc",
  "I&M Bank Rwanda Plc",
  "Equity Bank Rwanda Plc",
  "Access Bank Rwanda Plc",
  "Ecobank Rwanda Plc",
  "GT Bank Rwanda Plc",
  "Bank of Africa Rwanda Plc",
  "NCBA Bank Rwanda Plc",
  "Development Bank of Rwanda (BRD)",
  "Zigama Credit and Savings Bank",
] as const;

export const BANK_OTHER = "__other__" as const;

export function resolveBankName(
  bankId: string,
  otherName: string,
): string {
  if (!bankId) return "";
  if (bankId === BANK_OTHER) return otherName.trim();
  return bankId;
}

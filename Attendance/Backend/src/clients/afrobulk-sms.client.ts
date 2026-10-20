import { env } from "../config/env";

const OK_CODES = new Set(["1000", "1001", "1002", "1003", "1016", "OK", "SUCCESS"]);

function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+250${trimmed.slice(1)}`;
  if (trimmed.startsWith("250")) return `+${trimmed}`;
  return `+${trimmed}`;
}

export function isAfroBulkConfigured(): boolean {
  const key = env.SMS_API_KEY?.trim();
  if (!key || key === "YOUR_KEY" || key === "PASTE_REAL_AFROBULK_KEY" || key.length < 8) return false;
  return Boolean(env.SMS_API_URL && env.SMS_SENDER_ID);
}

/** Direct AfroBulkSMS compose API (same contract as Notification Service). */
export async function sendAfroBulkSms(to: string, body: string): Promise<{ delivered: boolean; providerCode?: string }> {
  if (!isAfroBulkConfigured()) {
    console.log(`[Attendance SMS dev] to ${to}\n${body}\n`);
    return { delivered: false };
  }

  const url = new URL(env.SMS_API_URL);
  url.searchParams.set("api_key", env.SMS_API_KEY);
  url.searchParams.set("from_type", "sender_id");
  if (env.SMS_FROM_NUMBER) url.searchParams.set("from_number", env.SMS_FROM_NUMBER);
  url.searchParams.set("sender_id", env.SMS_SENDER_ID);
  url.searchParams.set("to_numbers", normalizePhone(to));
  url.searchParams.set("body", body);

  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SMS HTTP ${res.status}: ${text}`);
  }

  let providerCode = "";
  try {
    const parsed = JSON.parse(text) as { response?: string | number };
    providerCode = String(parsed.response ?? "").trim();
  } catch {
    providerCode = text.trim();
  }

  const delivered =
    !providerCode || OK_CODES.has(providerCode) || OK_CODES.has(providerCode.toUpperCase());
  if (!delivered) {
    throw new Error(`SMS provider rejected send (code ${providerCode})`);
  }

  return { delivered: true, providerCode: providerCode || undefined };
}

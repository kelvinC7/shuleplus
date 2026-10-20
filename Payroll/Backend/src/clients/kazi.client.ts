import { env } from '../config/env';

export type KaziAdvanceForPayroll = {
  advanceId: string;
  requestNumber: string;
  employeeId: string;
  employeeCode: string;
  email?: string | null;
  employeeName: string;
  status: string;
  approvedAmount: number;
  remainingBalance: number;
  monthlyDeduction: number;
  repaymentMonths: number;
};

function kaziBase() {
  return (env.KAZI_INTEGRATION_ENABLED ? env.KAZI_API_URL || '' : '').replace(/\/$/, '').replace(/\/api$/, '');
}

const kaziWarned = new Set<string>();

function warnKaziOnce(key: string, message: string, err?: unknown) {
  if (kaziWarned.has(key)) return;
  kaziWarned.add(key);
  console.warn(message, err ?? '');
}

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
  };
}

/** Fetch active KaziAdvance deductions for an organization. */
export async function fetchKaziAdvancesForPayroll(
  organizationId: string
): Promise<KaziAdvanceForPayroll[]> {
  const base = kaziBase();
  if (!base) return [];

  try {
    const url = `${base}/api/internal/advances/for-payroll?organizationId=${encodeURIComponent(organizationId)}`;
    const res = await fetch(url, { headers: serviceHeaders() });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[kazi.client] for-payroll failed: ${res.status}`);
      return [];
    }
    const payload = (await res.json()) as { data?: KaziAdvanceForPayroll[] };
    return Array.isArray(payload.data) ? payload.data : [];
  } catch (err) {
    warnKaziOnce('for-payroll', '[kazi.client] for-payroll unreachable (Kazi integration disabled or API not running)', err);
    return [];
  }
}

/** Notify KaziAdvance that payroll deducted advance installments. */
export async function applyKaziPayrollDeductions(input: {
  organizationId: string;
  month?: number;
  year?: number;
  paymentRef?: string | null;
  items: Array<{
    employeeCode?: string | null;
    email?: string | null;
    amount: number;
    requestNumber?: string | null;
    advanceId?: string | null;
  }>;
}) {
  const base = kaziBase();
  if (!base || !input.items.length) return null;

  try {
    const res = await fetch(`${base}/api/internal/advances/apply-payroll-deductions`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[kazi.client] apply-payroll-deductions failed: ${res.status}`);
      return null;
    }
    return res.json();
  } catch (err) {
    warnKaziOnce('apply-deductions', '[kazi.client] apply-payroll-deductions unreachable', err);
    return null;
  }
}

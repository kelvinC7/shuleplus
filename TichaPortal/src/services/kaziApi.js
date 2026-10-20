import axios from 'axios';
import { attachIamAuth } from './iamAuth';
import { API_BASE_URL } from './api';

function resolveKaziBase() {
  if (import.meta.env.DEV) {
    return String(import.meta.env.VITE_KAZI_API_URL || 'http://localhost:4400').replace(/\/$/, '');
  }
  // Production: Ticha BFF uses KAZI_API_URL from ticha-api .env (loopback :4018).
  return `${API_BASE_URL}/kazi`;
}

const KAZI_API_URL = resolveKaziBase();

// Direct KaziAvance URL for static assets (images, uploads).
// In production the BFF proxy doesn't forward /uploads, so we hit KaziAvance directly.
export const KAZI_DIRECT_URL = String(
  import.meta.env.VITE_KAZI_API_URL || 'http://localhost:4400'
).replace(/\/$/, '');

export const kazi = axios.create({
  baseURL: KAZI_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

attachIamAuth(kazi);

const STATUS_TO_TICHA = {
  Pending: 'pending_accountant',
  Submitted: 'pending_accountant',
  'Under Review': 'sent_to_manager',
  Approved: 'approved',
  Disbursed: 'approved',
  Completed: 'approved',
  Rejected: 'rejected_by_accountant',
};

function mapRequest(row) {
  const purpose = String(row.purpose ?? '');
  const isDeal = /^ticha deal/i.test(purpose);
  return {
    id: row.id,
    request_number: row.requestNumber || row.requestNo,
    status: STATUS_TO_TICHA[row.status] || 'pending_accountant',
    kazi_status: row.status,
    amount_rwf: row.amount,
    amount_requested: row.amount,
    created_at: row.submittedAt || row.createdAt || row.date,
    repayment_term_months: row.months || row.repaymentMonths,
    description: row.description || purpose,
    purpose,
    request_type: isDeal ? 'service' : 'cashout',
    service_category: isDeal ? 'teacher_deals' : undefined,
  };
}

export async function kaziGetDashboard() {
  const { data } = await kazi.get('/api/employee/dashboard');
  return data;
}

export async function kaziGetHistory() {
  const { data } = await kazi.get('/api/employee/advance-history');
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.map(mapRequest);
}

export async function kaziGetAdvanceWorkspace() {
  const { data } = await kazi.get('/api/employee/advance-history');
  return {
    rows: Array.isArray(data?.data) ? data.data : [],
    summary: data?.summary ?? {},
    teacher: data?.teacher ?? null,
  };
}

export async function kaziGetCatalog() {
  const { data } = await kazi.get('/api/advance/catalog');
  return data?.data ?? { cashouts: [], deals: [], services: [] };
}

export async function kaziGetDeals() {
  const { data } = await kazi.get('/api/advance/deals');
  const rows = data?.data ?? [];
  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    title: d.name,
    price_rwf: d.price_rwf,
    description: d.description,
    short_description: d.shortDescription || d.short_description,
    image_url: d.imageUrl || d.image_url,
    category: d.category,
  }));
}

export async function kaziSubmitRequest({ amount, months, purpose, description }) {
  const { data } = await kazi.post('/api/advance/requests', {
    amount,
    months,
    purpose,
    description: description || '',
  });
  return data;
}

export async function kaziUpdateRequest(id, { amount, months, purpose, description }) {
  const { data } = await kazi.patch(`/api/advance/requests/${id}`, {
    amount,
    months,
    purpose,
    description: description || '',
  });
  return data;
}

export async function kaziCancelRequest(id) {
  const { data } = await kazi.delete(`/api/advance/requests/${id}`);
  return data;
}

const TEACHER_ELIGIBILITY_COPY = {
  "No salary on file - sync Payroll or set salary in admin":
    "Your salary is not on file yet. Ask your school admin to set it so you can request an advance.",
  "Advance access is blocked by organization policy": "Advance requests are currently turned off for your account.",
  "Account is suspended for advances": "Advance requests are paused on your account.",
  "Advance requests are paused on your account.": "Advance requests are paused on your account.",
  "Maximum advance limit reached": "You have reached your maximum advance limit. Finish repayment before requesting more.",
  "Advance Outstanding": "You have reached your advance limit. Finish repayment before requesting more.",
  "Employment is not currently active": "Your employment record is not active. Please contact your school admin.",
};

function teacherEligibilityMessage(reasons) {
  const list = Array.isArray(reasons) ? reasons : [];
  const mapped = list
    .filter((r) => r && !/^Employment and salary records/.test(r) && !/^Within organization/.test(r))
    .map((r) => {
      if (TEACHER_ELIGIBILITY_COPY[r]) return TEACHER_ELIGIBILITY_COPY[r];
      const min = /Minimum employment period is (\d+) months/.exec(r);
      if (min) return `You need at least ${min[1]} months of employment before you can request an advance.`;
      return r;
    });
  return mapped.join(" ");
}

export function eligibilityFromDashboard(dashboard) {
  if (!dashboard) return null;
  const fin = dashboard.financialSummary ?? {};
  const elig = dashboard.eligibility ?? {};
  const salary = fin.salary?.net ?? 0;
  const advance = fin.advance ?? {};
  const maxPct = advance.maxSalaryPercent ?? elig.maxSalaryPercent ?? 50;
  const maxAmt = advance.maxAdvanceAmount ?? elig.maxAdvanceAmount ?? 0;
  return {
    allowed: elig.status === 'Eligible',
    status: elig.status,
    message: teacherEligibilityMessage(elig.reasons),
    max_percent: maxPct,
    max_advance_amount: maxAmt,
    monthly_cap_rwf: advance.maxEligibleAmount ?? 0,
    remaining_cap_rwf: advance.availableLimit ?? 0,
    auto_approval_remaining_rwf: 0,
    net_salary_rwf: salary,
    ticha_avance_eligible: elig.status === 'Eligible',
  };
}

export function payrollFromDashboard(dashboard) {
  const salary = dashboard?.financialSummary?.salary;
  if (!salary) return null;
  return {
    net: Number(salary.net) || 0,
    gross: Number(salary.gross) || 0,
    allowancesTotal: 0,
    basic: Number(salary.net) || 0,
  };
}

export { KAZI_API_URL };

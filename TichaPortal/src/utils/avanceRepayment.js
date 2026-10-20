/** Convert a loan period into calendar days (30-day months). */
export function daysInPeriod(count, unit) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (unit === "days") return n;
  if (unit === "weeks") return n * 7;
  return n * 30;
}

export function intervalDays(frequency) {
  if (frequency === "daily") return 1;
  if (frequency === "weekly") return 7;
  return 30;
}

export function frequencyLabel(frequency) {
  if (frequency === "daily") return "Daily";
  if (frequency === "weekly") return "Weekly";
  return "Monthly";
}

export function periodUnitLabel(unit, count = 1) {
  const n = Number(count) || 0;
  if (unit === "days") return n === 1 ? "Day" : "Days";
  if (unit === "weeks") return n === 1 ? "Week" : "Weeks";
  return n === 1 ? "Month" : "Months";
}

export function suggestedFrequency(unit) {
  if (unit === "days") return "daily";
  if (unit === "weeks") return "weekly";
  return "monthly";
}

/** Months to send to KaziAdvance (payroll still plans in months). */
export function toApiMonths(count, unit) {
  const n = Math.max(1, Math.floor(Number(count) || 1));
  if (unit === "months") return n;
  if (unit === "weeks") return Math.max(1, Math.round(n / 4));
  return Math.max(1, Math.round(n / 30));
}

export function formatFrw(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString("en-US")} Frw`;
}

export function formatPlanDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function firstPaymentDate(frequency, from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  if (frequency === "monthly") {
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
    return d;
  }
  d.setDate(d.getDate() + 1);
  return d;
}

export function addPaymentInterval(date, frequency, index) {
  const d = new Date(date);
  if (frequency === "daily") d.setDate(d.getDate() + index);
  else if (frequency === "weekly") d.setDate(d.getDate() + index * 7);
  else d.setMonth(d.getMonth() + index);
  return d;
}

/**
 * Instant repayment plan.
 * Examples:
 *   150,000 / 3 months / monthly → 3 × 50,000
 *   300,000 / 12 weeks / weekly → 12 × 25,000
 *   300,000 / 30 days / daily → 30 × 10,000
 */
export function computeAvancePlan({
  amount,
  periodCount,
  periodUnit = "months",
  frequency = "monthly",
  serviceFee = 0,
  interest = 0,
}) {
  const principal = Math.max(0, Number(amount) || 0);
  const count = Math.max(0, Math.floor(Number(periodCount) || 0));
  const fee = Math.max(0, Math.round(Number(serviceFee) || 0));
  const extra = Math.max(0, Math.round(Number(interest) || 0));
  const totalDays = daysInPeriod(count, periodUnit);
  const step = intervalDays(frequency);
  const payments = count < 1 || principal <= 0 ? 0 : Math.max(1, Math.round(totalDays / step));
  const totalRepayment = principal + fee + extra;
  const base = payments > 0 ? Math.floor(totalRepayment / payments) : 0;
  const remainder = payments > 0 ? totalRepayment - base * payments : 0;

  const start = firstPaymentDate(frequency);
  const schedule = Array.from({ length: payments }, (_, i) => {
    const installment = i === payments - 1 ? base + remainder : base;
    return {
      n: i + 1,
      due: addPaymentInterval(start, frequency, i),
      amount: installment,
      status: "Upcoming",
    };
  });

  return {
    principal,
    periodCount: count,
    periodUnit,
    frequency,
    payments,
    perPayment: base,
    lastPaymentAmount: payments ? base + remainder : 0,
    serviceFee: fee,
    interest: extra,
    totalRepayment,
    firstPayment: schedule[0]?.due ?? null,
    lastPayment: schedule[schedule.length - 1]?.due ?? null,
    schedule,
  };
}

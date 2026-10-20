import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { kaziSubmitRequest } from "../services/kaziApi";
import {
  computeAvancePlan,
  formatFrw,
  formatPlanDate,
  frequencyLabel,
  periodUnitLabel,
  toApiMonths,
} from "../utils/avanceRepayment";

const FREQUENCIES = [
  { id: "daily", label: "Daily", Icon: Calendar },
  { id: "weekly", label: "Weekly", Icon: CalendarDays },
  { id: "monthly", label: "Monthly", Icon: CalendarRange },
];

export default function TichaAvanceRequestModal({ open, eligibility, onClose, onSubmitted }) {
  const [amount, setAmount] = useState("");
  const [periodCount, setPeriodCount] = useState(3);
  const [frequency, setFrequency] = useState("monthly");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const available = Number(eligibility?.remaining_cap_rwf || eligibility?.monthly_cap_rwf || 0);

  const plan = useMemo(
    () => computeAvancePlan({ amount, periodCount, periodUnit: "months", frequency, serviceFee: 0, interest: 0 }),
    [amount, periodCount, frequency]
  );

  const entered = Number(String(amount).replace(/[^\d.]/g, "")) || 0;
  const overLimit = available > 0 && entered > available;
  const blocked = Boolean(eligibility?.status && eligibility.status !== "Eligible");
  const canSubmit = entered > 0 && periodCount >= 1 && plan.payments > 0 && !overLimit && !blocked && !submitting;

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setPeriodCount(3);
    setFrequency("monthly");
    setScheduleOpen(false);
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function submitAdvance() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const desc = [
        `Loan period: ${plan.periodCount} ${periodUnitLabel("months", plan.periodCount)}`,
        `Frequency: ${frequencyLabel(frequency)}`,
        `${plan.payments} payments of ${formatFrw(plan.perPayment)}`,
      ].join(" · ");
      const result = await kaziSubmitRequest({
        amount: entered,
        months: toApiMonths(periodCount, "months"),
        purpose: "Salary advance",
        description: desc,
      });
      if (result?.id || result?.requestNumber) {
        onSubmitted?.(result);
        onClose();
      } else {
        setError(result?.message || "Submit failed.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-[301] flex max-h-[min(96svh,100dvh)] w-full flex-col overflow-hidden rounded-t-[28px] bg-white sm:max-h-[92vh] sm:max-w-[520px] sm:rounded-[24px]">
        <div className="shrink-0 bg-[linear-gradient(145deg,#0E1F35,#1B3354)] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90">New Request</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Request a salary advance</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Available</p>
            <p className="text-xl font-black text-white">{available > 0 ? formatFrw(available) : "-"}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-white/50">Maximum amount you can currently request.</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <label className="block">
            <span className="text-sm font-semibold text-[#000435]">Amount Requested</span>
            <div className="relative mt-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 pr-16 text-xl font-bold text-[#000435] outline-none focus:border-[#fcb038]"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Frw</span>
            </div>
          </label>
          {overLimit ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertCircle size={13} /> Amount is above your available advance.
            </p>
          ) : blocked ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertCircle size={13} /> {eligibility?.message || "You are not currently eligible for an advance."}
            </p>
          ) : null}

          <div className="mt-5">
            <p className="text-sm font-semibold text-[#000435]">Loan Period</p>
            <select
              value={periodCount}
              onChange={(e) => setPeriodCount(Number(e.target.value))}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#000435] outline-none focus:border-[#fcb038]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "Month" : "Months"}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-[#000435]">Payment Frequency</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FREQUENCIES.map(({ id, label, Icon }) => {
                const active = frequency === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFrequency(id)}
                    className={`relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-sm font-semibold ${
                      active ? "border-[#000435] bg-[#000435] text-white" : "border-black/10 bg-white text-[#000435]"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                    {active ? <Check size={14} className="absolute right-2 top-2 text-[#fcb038]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 bg-[#f8f9fc] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Repayment Summary</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Advance Amount" value={entered ? formatFrw(entered) : "-"} />
              <Row label="Loan Period" value={`${plan.periodCount || "-"} ${periodUnitLabel("months", plan.periodCount)}`} />
              <Row label="Payment Frequency" value={frequencyLabel(frequency)} />
              <Row label="Number of Payments" value={plan.payments || "-"} />
              <Row label="Payment Per Period" value={plan.payments ? formatFrw(plan.perPayment) : "-"} accent />
              {plan.serviceFee > 0 ? <Row label="Service Fee" value={formatFrw(plan.serviceFee)} /> : null}
              <div className="border-t border-dashed border-black/10 pt-2.5">
                <Row label="Total Repayment" value={entered ? formatFrw(plan.totalRepayment) : "-"} bold />
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-2xl border border-black/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Repayment Preview</p>
              <button
                type="button"
                disabled={!plan.schedule.length}
                onClick={() => setScheduleOpen(true)}
                className="text-xs font-semibold text-[#000435] disabled:opacity-40"
              >
                View Schedule
              </button>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="First Payment" value={plan.firstPayment ? formatPlanDate(plan.firstPayment) : "-"} />
              <Row label="Frequency" value={frequencyLabel(frequency)} />
              <Row label="Number of Payments" value={plan.payments || "-"} />
              <Row label="Payment Amount" value={plan.payments ? formatFrw(plan.perPayment) : "-"} />
              <Row label="Last Payment" value={plan.lastPayment ? formatPlanDate(plan.lastPayment) : "-"} />
            </dl>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-black/5 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} className="h-12 rounded-xl border border-black/10 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submitAdvance()}
            className="h-12 rounded-xl bg-re-orange px-6 text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-40"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Submitting…
              </span>
            ) : (
              "Request Advance"
            )}
          </button>
        </div>
      </div>

      {scheduleOpen
        ? createPortal(
            <div className="fixed inset-0 z-[320] flex justify-end bg-black/40">
              <button type="button" className="absolute inset-0" aria-label="Close schedule" onClick={() => setScheduleOpen(false)} />
              <div className="relative z-[321] flex h-full w-full max-w-md flex-col bg-white">
                <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
                  <h3 className="text-base font-bold text-[#000435]">Repayment schedule</h3>
                  <button type="button" className="rounded-full p-2 hover:bg-slate-50" onClick={() => setScheduleOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <th className="pb-3">#</th>
                        <th className="pb-3">Due Date</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.schedule.map((row) => (
                        <tr key={row.n} className="border-t border-black/5">
                          <td className="py-3 font-semibold text-[#000435]">{row.n}</td>
                          <td className="py-3 text-slate-600">{formatPlanDate(row.due)}</td>
                          <td className="py-3 font-semibold text-[#000435]">{formatFrw(row.amount)}</td>
                          <td className="py-3">
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>,
    document.body
  );
}

function Row({ label, value, accent, bold }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${bold ? "font-bold text-[#000435]" : accent ? "font-bold text-[#fcb038]" : "font-semibold text-[#000435]"}`}>
        {value}
      </dd>
    </div>
  );
}

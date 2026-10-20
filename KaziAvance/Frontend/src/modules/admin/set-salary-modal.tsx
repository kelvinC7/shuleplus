"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { formatRwf } from "@/config/org-admin-nav";
import { adminApi } from "@/services/admin-api";
import { FormSheet } from "@/components/ui/form-sheet";
import type { AdminEmployee } from "./types";

interface SetSalaryModalProps {
  employee: AdminEmployee | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SetSalaryModal({ employee, onClose, onSaved }: SetSalaryModalProps) {
  const [gross, setGross] = useState("");
  const [allowances, setAllowances] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [net, setNet] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [netTouched, setNetTouched] = useState(false);

  useEffect(() => {
    if (!employee) return;
    setGross(employee.grossSalary && employee.grossSalary > 0 ? String(employee.grossSalary) : "");
    setAllowances(String(employee.allowances ?? 0));
    setDeductions(String(employee.deductions ?? 0));
    setNet(employee.netSalary > 0 ? String(employee.netSalary) : "");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setReason("");
    setError("");
    setNetTouched(false);
  }, [employee]);

  const computedNet = useMemo(() => {
    return Math.round(Number(gross || 0) + Number(allowances || 0) - Number(deductions || 0));
  }, [gross, allowances, deductions]);

  const verifiedNet = netTouched ? Number(net || 0) : computedNet;

  if (!employee) return null;
  const selected = employee;

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (Number(gross) <= 0) throw new Error("Monthly/Gross salary is required");
      if (verifiedNet <= 0) throw new Error("Net salary must be calculated and greater than zero");
      await adminApi.updateEmployeeSalary(selected.id, {
        grossSalary: Number(gross),
        allowances: Number(allowances || 0),
        deductions: Number(deductions || 0),
        netSalary: verifiedNet,
        effectiveDate,
        reason,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save salary");
    } finally {
      setSaving(false);
    }
  }

  const verified = verifiedNet > 0 && Number(gross) > 0;

  return (
    <FormSheet
      title="Set employee salary"
      subtitle={`${employee.fullName} · ${employee.employeeCode}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save & recalculate"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Live net salary</p>
          <p className="mt-1 text-2xl font-bold text-navy">{verifiedNet > 0 ? formatRwf(verifiedNet) : "—"}</p>
          <p className="text-xs text-muted">Gross + allowances − deductions</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Monthly / gross" value={gross} onChange={setGross} placeholder="e.g. 450000" autoFocus />
          <Field label="Allowances" value={allowances} onChange={setAllowances} />
          <Field label="Deductions" value={deductions} onChange={setDeductions} />
          <Field
            label="Net salary"
            value={netTouched ? net : String(computedNet || "")}
            onChange={(v) => {
              setNetTouched(true);
              setNet(v);
            }}
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Effective date</span>
            <input type="date" className="input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Salary source</span>
            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-navy">
              KaziAvance
            </div>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Reason for update</span>
          <textarea
            className="input min-h-[88px] resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this salary being set or changed?"
          />
        </label>

        <div
          className={`flex gap-3 rounded-2xl border px-4 py-3 ${
            verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${verified ? "text-emerald-700" : "text-amber-700"}`} />
          <div className={`text-sm ${verified ? "text-emerald-950" : "text-amber-950"}`}>
            <p className="font-semibold">Net salary verification</p>
            <p className="mt-0.5 leading-relaxed">
              {verified
                ? `Verified net salary is ${formatRwf(verifiedNet)}. Eligibility will be recalculated on save.`
                : "Net salary must be calculated and verified before this employee can become eligible for an advance."}
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </FormSheet>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        autoFocus={autoFocus}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

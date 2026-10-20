"use client";

import { useEffect, useState } from "react";
import { KaziPageLayout } from "@/components/kazi-page-layout";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader } from "@/hooks/use-async-data";
import type { OrgPolicies } from "./types";

export function AdminPoliciesView() {
  const [policies, setPolicies] = useState<OrgPolicies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasPayroll, setHasPayroll] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [p, d] = await Promise.all([adminApi.getPolicies(), adminApi.getDashboard()]);
        setPolicies(p);
        setHasPayroll(d.hasPayrollIntegration);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load policies");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    if (!policies) return;
    setSaving(true);
    try {
      const updated = await adminApi.updatePolicies(policies);
      setPolicies(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error || !policies) return <PageError message={error ?? "Unable to load policies"} />;

  return (
    <KaziPageLayout actions={<button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save policies"}</button>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-navy">General Policies</h2>
          <div className="mt-4 space-y-4">
            {([
              ["maxAdvancePercent", "Maximum advance percentage"],
              ["defaultRepaymentPeriod", "Default repayment period (months)"],
              ["minEmploymentMonths", "Minimum employment duration (months)"],
              ["waitingPeriodDays", "Waiting period (days)"],
              ["maxActiveAdvances", "Maximum active advances per employee"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-muted">{label}</span>
                <input type="number" className="input mt-1" value={policies[key]} onChange={(e) => setPolicies({ ...policies, [key]: Number(e.target.value) })} />
              </label>
            ))}
          </div>
        </div>
        <div className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-navy">Approval Rules</h2>
          <div className="mt-4 space-y-4">
            {([
              ["autoApprove", "Auto approve eligible requests"],
              ["requireManagerApproval", "Require manager approval"],
              ["requireFinanceApproval", "Require finance approval"],
              ["requireDocuments", "Require supporting documents"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-slate-50/50 px-4 py-3">
                <span className="text-sm font-medium text-navy">{label}</span>
                <input type="checkbox" className="h-4 w-4 rounded" checked={policies[key]} onChange={(e) => setPolicies({ ...policies, [key]: e.target.checked })} />
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="hr-card p-5 sm:p-6">
        <h2 className="text-sm font-bold text-navy">Salary Integration</h2>
        <p className="mt-2 text-sm text-muted">
          {hasPayroll ? "Payroll module is connected. Gross salary, net salary, deductions, and allowances are pulled automatically." : "Payroll is not connected. Enter salaries manually per employee."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {["Gross Salary", "Net Salary", "Deductions", "Allowances"].map((field) => (
            <div key={field} className={`rounded-xl border px-4 py-3 ${hasPayroll ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className={`text-xs font-semibold ${hasPayroll ? "text-emerald-800" : "text-amber-800"}`}>{field}</p>
              <p className={`mt-1 text-sm font-bold ${hasPayroll ? "text-emerald-900" : "text-amber-900"}`}>{hasPayroll ? "Auto-synced" : "Manual entry"}</p>
            </div>
          ))}
        </div>
      </div>
    </KaziPageLayout>
  );
}

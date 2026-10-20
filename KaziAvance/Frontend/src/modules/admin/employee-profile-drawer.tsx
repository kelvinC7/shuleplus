"use client";

import { useEffect, useState } from "react";
import {
  X,
  User,
  ShieldCheck,
  KeyRound,
  Wallet,
  Mail,
  Phone,
  Copy,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarInitials } from "@/components/kazi-data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatRwf } from "@/config/org-admin-nav";
import { adminApi } from "@/services/admin-api";
import { AdvanceEligibilityBadge, SalarySourceBadge, needsSalarySetup } from "./advance-eligibility-badge";
import type { AdminEmployee, EmployeeProfile } from "./types";

interface EmployeeProfileDrawerProps {
  employeeId: string | null;
  hasHrIntegration?: boolean;
  initialTab?: "overview" | "eligibility" | "account" | "advances" | "salary";
  reloadToken?: number;
  onClose: () => void;
  onUpdated?: () => void;
  onSetSalary?: (employee: AdminEmployee) => void;
  onEditEmployee?: (employee: AdminEmployee) => void;
}

export function EmployeeProfileDrawer({
  employeeId,
  hasHrIntegration = false,
  initialTab = "overview",
  reloadToken = 0,
  onClose,
  onUpdated,
  onSetSalary,
  onEditEmployee,
}: EmployeeProfileDrawerProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    if (!employeeId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    setActionMsg(null);
    setTempPassword(null);
    void adminApi
      .getEmployeeProfile(employeeId)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [employeeId, reloadToken]);

  if (!employeeId) return null;

  const id = employeeId;
  const emp = profile?.employee;
  const account = profile?.account;
  const payrollOn = profile?.hasPayrollIntegration ?? emp?.payrollEnabled ?? false;
  const salaryMissing = needsSalarySetup(emp?.advanceEligibility);

  async function refresh() {
    const refreshed = await adminApi.getEmployeeProfile(id);
    setProfile(refreshed);
    onUpdated?.();
  }

  async function runAction(fn: () => Promise<{ message: string; tempPassword?: string | null }>) {
    setBusy(true);
    setActionMsg(null);
    setTempPassword(null);
    try {
      const result = await fn();
      setActionMsg(result.message);
      if (result.tempPassword) setTempPassword(result.tempPassword);
      await refresh();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function fetchPayroll() {
    setBusy(true);
    setActionMsg(null);
    try {
      await adminApi.fetchPayrollSalary(id);
      await refresh();
      setActionMsg("Salary synced from Payroll.");
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Could not fetch payroll salary");
    } finally {
      setBusy(false);
    }
  }

  async function setAdvance(allow: boolean) {
    setBusy(true);
    setActionMsg(null);
    try {
      await adminApi.updateEligibility(id, {
        allowAdvance: allow,
        eligibilityStatus: allow ? "Eligible" : "Disabled",
      });
      await refresh();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Could not update eligibility");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close profile"
        className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] flex-col border-l border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          {emp ? (
            <div className="flex items-center gap-3">
              {emp.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emp.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <AvatarInitials name={emp.fullName} />
              )}
              <div>
                <h2 className="text-lg font-bold text-navy">{emp.fullName}</h2>
                <p className="text-sm text-muted">
                  {emp.employeeCode} · {emp.department} · {emp.position}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AdvanceEligibilityBadge status={emp.advanceEligibility} />
                  <SalarySourceBadge source={emp.salarySource} />
                  {(profile?.hasHrIntegration ?? hasHrIntegration) ? (
                    <span className="badge bg-emerald-100 text-emerald-800">Synced from HR</span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-navy">Employee Details</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted hover:bg-slate-50 hover:text-navy"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : profile && emp ? (
            <Tabs key={`${id}-${initialTab}`} defaultValue={initialTab}>
              <TabsList>
                <TabsTrigger value="overview">Profile</TabsTrigger>
                <TabsTrigger value="salary">Salary</TabsTrigger>
                <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="advances">Advances</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <ProfileTab employee={emp} profile={profile} />
              </TabsContent>

              <TabsContent value="salary">
                <SalaryTab
                  employee={emp}
                  profile={profile}
                  payrollOn={payrollOn}
                  salaryMissing={salaryMissing}
                  busy={busy}
                  onFetchPayroll={() => void fetchPayroll()}
                  onSetSalary={() => onSetSalary?.(emp)}
                />
              </TabsContent>

              <TabsContent value="eligibility">
                <EligibilityTab
                  employee={emp}
                  salaryMissing={salaryMissing}
                  payrollOn={payrollOn}
                  busy={busy}
                  onAllow={() => void setAdvance(true)}
                  onDisable={() => void setAdvance(false)}
                  onSetSalary={() => onSetSalary?.(emp)}
                  onFetchPayroll={() => void fetchPayroll()}
                  onEdit={() => onEditEmployee?.(emp)}
                  onUpdated={onUpdated}
                />
              </TabsContent>

              <TabsContent value="account">
                <AccountTab
                  account={account!}
                  customPassword={customPassword}
                  setCustomPassword={setCustomPassword}
                  tempPassword={tempPassword}
                  busy={busy}
                  actionMsg={actionMsg}
                  onCreateLogin={() =>
                    runAction(() =>
                      adminApi.createEmployeeLogin(id, {
                        password: customPassword || undefined,
                        sendCredentialsEmail: true,
                      })
                    )
                  }
                  onResetPassword={() =>
                    runAction(() =>
                      adminApi.resetEmployeePassword(id, {
                        password: customPassword || undefined,
                        sendEmail: true,
                      })
                    )
                  }
                  onDisable={() => runAction(() => adminApi.disableEmployeeLogin(id))}
                  onEnable={() => runAction(() => adminApi.enableEmployeeLogin(id))}
                />
              </TabsContent>

              <TabsContent value="advances">
                <AdvancesTab profile={profile} />
              </TabsContent>
            </Tabs>
          ) : null}

          {actionMsg ? (
            <p className="mt-4 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-navy">{actionMsg}</p>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function ProfileTab({ employee, profile }: { employee: AdminEmployee; profile: EmployeeProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Employee ID" value={employee.employeeCode} icon={<User size={16} />} />
        <InfoCard label="Email" value={employee.email ?? "—"} icon={<Mail size={16} />} />
        <InfoCard label="Phone" value={employee.phone || "—"} icon={<Phone size={16} />} />
        <InfoCard label="Department" value={employee.department} icon={<User size={16} />} />
        <InfoCard label="Position" value={employee.position} icon={<User size={16} />} />
        <InfoCard
          label="Employment status"
          value={<StatusBadge status={employee.accountStatus} />}
          icon={<ShieldCheck size={16} />}
        />
        <InfoCard
          label="Employment date"
          value={employee.hireDate ? employee.hireDate.slice(0, 10) : "—"}
          icon={<User size={16} />}
        />
        <InfoCard label="Net salary" value={employee.netSalary > 0 ? formatRwf(employee.netSalary) : "—"} icon={<Wallet size={16} />} />
      </div>
      {profile.payrollRecords.length > 0 ? (
        <p className="text-xs text-muted">Open the Salary tab for payroll history and source details.</p>
      ) : null}
    </div>
  );
}

function SalaryTab({
  employee,
  profile,
  payrollOn,
  salaryMissing,
  busy,
  onFetchPayroll,
  onSetSalary,
}: {
  employee: AdminEmployee;
  profile: EmployeeProfile;
  payrollOn: boolean;
  salaryMissing: boolean;
  busy: boolean;
  onFetchPayroll: () => void;
  onSetSalary: () => void;
}) {
  return (
    <div className="space-y-4">
      {salaryMissing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-950">
            <AlertTriangle size={16} />
            Salary Information Required
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Users & Access only creates the login. Enter monthly/gross salary here (or Fetch from Payroll). After net salary is saved, this teacher can request Ticha Avance.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {payrollOn ? (
              <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={onFetchPayroll}>
                Fetch from Payroll
              </button>
            ) : null}
            <button type="button" className="btn-primary text-xs" onClick={onSetSalary}>
              Set Salary Manually
            </button>
          </div>
        </div>
      ) : null}

      <div className="hr-card space-y-3 p-5">
        <h3 className="text-sm font-bold text-navy">Salary Information</h3>
        <dl className="space-y-3 text-sm">
          <Row label="Salary Source" value={<SalarySourceBadge source={employee.salarySource} />} />
          <Row
            label="Last Synced"
            value={
              employee.salaryUpdatedAt
                ? new Date(employee.salaryUpdatedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                : "—"
            }
          />
          <Row label="Gross Salary" value={employee.grossSalary ? formatRwf(employee.grossSalary) : "—"} />
          <Row label="Allowances" value={formatRwf(employee.allowances ?? 0)} />
          <Row label="Deductions" value={formatRwf((employee.deductions ?? employee.taxAmount) || 0)} />
          <Row label="Net Salary" value={employee.netSalary > 0 ? formatRwf(employee.netSalary) : "—"} />
          <Row label="Payroll Status" value={employee.payrollStatus || (payrollOn ? "Not synced" : "Payroll not enabled")} />
        </dl>
      </div>

      {profile.payrollRecords.length > 0 ? (
        <div className="hr-card p-5">
          <h3 className="text-sm font-bold text-navy">Salary history</h3>
          <ul className="mt-3 space-y-2">
            {profile.payrollRecords.map((p, i) => (
              <li key={`${p.monthLabel}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  {p.monthLabel}
                  {p.source ? ` · ${p.source === "payroll-api" ? "Payroll" : "KaziAvance"}` : ""}
                </span>
                <span className="font-semibold text-navy">{formatRwf(p.netSalary)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EligibilityTab({
  employee,
  salaryMissing,
  payrollOn,
  busy,
  onAllow,
  onDisable,
  onSetSalary,
  onFetchPayroll,
  onEdit,
  onUpdated,
}: {
  employee: AdminEmployee;
  salaryMissing: boolean;
  payrollOn: boolean;
  busy: boolean;
  onAllow: () => void;
  onDisable: () => void;
  onSetSalary: () => void;
  onFetchPayroll: () => void;
  onEdit: () => void;
  onUpdated?: () => void;
}) {
  const eligible = employee.advanceEligibility === "Eligible";
  const [editing, setEditing] = useState(false);
  const [maxAmount, setMaxAmount] = useState(String(employee.maxAdvanceAmount ?? 0));
  const [maxPercent, setMaxPercent] = useState(String(employee.maxSalaryPercent ?? 50));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function saveLimits() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await adminApi.updateEligibility(employee.id, {
        maxAdvanceAmount: Number(maxAmount) || 0,
        maxSalaryPercent: Number(maxPercent) || 50,
      });
      setSaveMsg("Saved.");
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {salaryMissing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-950">
            <AlertTriangle size={16} />
            Salary Information Required
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Set salary on the Salary tab first. Allow Advance is available after net salary is on file.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {payrollOn ? (
              <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={onFetchPayroll}>
                Fetch from Payroll
              </button>
            ) : null}
            <button type="button" className="btn-primary text-xs" onClick={onSetSalary}>
              Set Salary Manually
            </button>
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-4 ${eligible ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
          <p className="font-semibold text-navy">
            {eligible ? "✅ Eligible for Advance" : `${employee.advanceEligibility}`}
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Maximum Advance" value={formatRwf(employee.maxAdvanceAmount ?? 0)} />
            <Row label="Current Outstanding Advance" value={employee.activeAdvance > 0 ? formatRwf(employee.activeAdvance) : "—"} />
            <Row label="Available Advance" value={formatRwf(employee.availableAdvance ?? 0)} />
            <Row label="Eligibility Rule" value={employee.eligibilityRule ?? `Up to ${employee.maxSalaryPercent ?? 50}% of Net Salary`} />
          </dl>
        </div>
      )}

      {!salaryMissing && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-navy">Advance Limit Settings</p>
          <p className="mt-1 text-xs text-muted">Set the maximum advance this employee can request. Teacher can make multiple requests until this limit is reached.</p>
          {editing ? (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted">Maximum Advance Amount (RWF)</span>
                <input
                  type="number"
                  min={0}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="input mt-1"
                  placeholder="0 = use percentage only"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted">Maximum Salary Percent (%)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxPercent}
                  onChange={(e) => setMaxPercent(e.target.value)}
                  className="input mt-1"
                />
              </label>
              <p className="text-[10px] text-muted">If both are set, the lower value is used as the limit.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary text-xs" disabled={saving} onClick={() => void saveLimits()}>
                  {saving ? "Saving…" : "Save Limits"}
                </button>
                <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <dl className="space-y-1.5 text-sm">
                <Row label="Max Amount" value={employee.maxAdvanceAmount && employee.maxAdvanceAmount > 0 ? formatRwf(employee.maxAdvanceAmount) : "Not set"} />
                <Row label="Max Percent" value={`${employee.maxSalaryPercent ?? 50}%`} />
              </dl>
              <button type="button" className="btn-secondary text-xs mt-3" onClick={() => setEditing(true)}>
                Edit Limits
              </button>
            </div>
          )}
          {saveMsg && <p className="mt-2 text-xs text-navy">{saveMsg}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-xs" disabled={busy || salaryMissing} onClick={onAllow}>
          Allow Advance
        </button>
        <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={onDisable}>
          Disable Advance
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={onEdit}>
          Edit Eligibility
        </button>
      </div>
    </div>
  );
}

function AccountTab({
  account,
  customPassword,
  setCustomPassword,
  tempPassword,
  busy,
  actionMsg,
  onCreateLogin,
  onResetPassword,
  onDisable,
  onEnable,
}: {
  account: EmployeeProfile["account"];
  customPassword: string;
  setCustomPassword: (v: string) => void;
  tempPassword: string | null;
  busy: boolean;
  actionMsg: string | null;
  onCreateLogin: () => void;
  onResetPassword: () => void;
  onDisable: () => void;
  onEnable: () => void;
}) {
  const hasLogin = account.hasLogin || account.status === "ACTIVE";

  return (
    <div className="space-y-4">
      <div className="hr-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-navy">
          <KeyRound size={16} className="text-primary" />
          Shule+ login account
        </h3>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Email" value={account.email} />
          <Row
            label="Account status"
            value={
              <StatusBadge
                status={
                  account.status === "ACTIVE"
                    ? "Active"
                    : account.status === "NO_ACCOUNT"
                      ? "No account"
                      : account.status === "INACTIVE"
                        ? "Inactive"
                        : account.status
                }
              />
            }
          />
          <Row label="KaziAdvance access" value={account.modules.includes("kaziavance") ? "Licensed" : "Not assigned"} />
          <Row label="Last login" value={account.lastLoginAt ? account.lastLoginAt.replace("T", " ").slice(0, 16) : "Never"} />
        </dl>
      </div>

      {!hasLogin ? (
        <div className="hr-card space-y-4 p-5">
          <p className="text-sm text-muted">
            This employee does not have a Shule+ login yet. Create one to grant KaziAdvance employee portal access.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Optional custom password</span>
            <input
              type="text"
              className="input mt-1"
              placeholder="Leave blank to auto-generate"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
            />
          </label>
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={onCreateLogin}>
            <KeyRound size={16} />
            {busy ? "Creating…" : "Create login & send credentials"}
          </button>
        </div>
      ) : (
        <div className="hr-card space-y-4 p-5">
          <label className="block">
            <span className="text-xs font-semibold text-muted">New password (optional)</span>
            <input
              type="text"
              className="input mt-1"
              placeholder="Auto-generate if empty"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={onResetPassword}>
              <RefreshCw size={14} />
              Reset password
            </button>
            {account.status === "ACTIVE" ? (
              <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={onDisable}>
                <Lock size={14} />
                Disable login
              </button>
            ) : (
              <button type="button" className="btn-primary text-xs" disabled={busy} onClick={onEnable}>
                <Unlock size={14} />
                Enable login
              </button>
            )}
          </div>
        </div>
      )}

      {tempPassword ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 size={16} />
            Temporary password (copy now — shown once)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-white px-3 py-2 font-mono text-sm text-navy">{tempPassword}</code>
            <button
              type="button"
              className="rounded-xl border border-border p-2 hover:bg-white"
              onClick={() => void navigator.clipboard.writeText(tempPassword)}
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {actionMsg ? (
        <p className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-navy">{actionMsg}</p>
      ) : null}
    </div>
  );
}

function AdvancesTab({ profile }: { profile: EmployeeProfile }) {
  if (!profile.advances.length) {
    return <p className="text-sm text-muted">No advance requests for this employee.</p>;
  }
  return (
    <div className="space-y-3">
      {profile.advances.map((a) => (
        <div key={a.id} className="hr-card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-mono text-xs text-muted">{a.requestNumber}</p>
            <p className="font-semibold text-navy">{formatRwf(a.amount)}</p>
            <p className="text-xs text-muted">{a.purpose} · {a.requestDate}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>
      ))}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="hr-card p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-navy">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-navy">{value}</dd>
    </div>
  );
}

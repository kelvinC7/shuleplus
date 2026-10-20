'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  Briefcase,
  Building2,
  Clock,
  FileText,
  Gift,
  MinusCircle,
  Pencil,
  Receipt,
  Save,
  Shield,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { AvatarInitials } from '@/components/payroll-data-table';
import { SalaryField, SalaryMiniStat, SalaryPanel, SalaryEmpty } from '@/components/salary-ui';
import { formatRwf } from '@/config/payroll-nav';
import { payrollApi, type PayrollStaff } from '@/services/payroll-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  DEFAULT_ALLOWANCE_RULES,
  DEFAULT_PAYE_BRACKETS,
  DEFAULT_STATUTORY,
  type PayeBracket,
  type PayrollLineItem,
  calcRwandaPayroll,
  solveNetToGrossPackage,
} from '@/utils/rwandaPayrollEngine';

export interface TemplateConfig {
  statutory: typeof DEFAULT_STATUTORY;
  payeRates: PayeBracket[];
  allowanceRules: typeof DEFAULT_ALLOWANCE_RULES;
  templateDeductions: PayrollLineItem[];
  templateAllowances: PayrollLineItem[];
}

interface Props {
  staff: PayrollStaff;
  mode: 'normal' | 'netToGross';
  template: TemplateConfig;
  templateName?: string;
  variant?: 'inline' | 'drawer';
  onClose?: () => void;
  onSaved?: () => void;
}

const DRAWER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'deductions', label: 'Deductions' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'documents', label: 'Documents' },
  { id: 'history', label: 'History' },
  { id: 'audit', label: 'Audit Logs' },
] as const;

type DrawerTab = (typeof DRAWER_TABS)[number]['id'];

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
      {icon} {children}
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCB038]/15 text-[#000435]">{icon}</span>
        <h3 className="text-sm font-bold text-navy">{title}</h3>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-navy">{value || '—'}</dd>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-extrabold tracking-tight ${accent ? 'text-[#FCB038]' : 'text-[#000435]'}`}>
        {value}
      </p>
    </div>
  );
}

function AmountCard({
  label,
  value,
  editing,
  onChange,
  fromTemplate,
}: {
  label: string;
  value: number;
  editing?: boolean;
  onChange?: (v: number) => void;
  fromTemplate?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-[#FCB038]/30 hover:shadow-md">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      {editing && onChange ? (
        <input
          type="number"
          className="input mt-2 !rounded-[14px] !py-2.5 text-base font-bold"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-lg font-bold text-navy">{value > 0 ? formatRwf(value) : '—'}</p>
          {fromTemplate && (
            <span className="rounded-full bg-[#FCB038]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#000435]">
              Template
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${
        active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function StaffSalaryEditor({
  staff,
  mode,
  template,
  templateName = 'Default Rwanda Template',
  variant = 'drawer',
  onClose,
  onSaved,
}: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    othersAllowance: 0,
    mealAllowance: 0,
    desiredNet: 0,
  });
  const [deductions, setDeductions] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [advanceMonthly, setAdvanceMonthly] = useState(0);

  useEffect(() => {
    setTab(mode === 'netToGross' ? 'earnings' : 'overview');
    setEditing(false);
  }, [mode, staff.id]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, deductionsRes, advanceRes] = await Promise.all([
        payrollApi.getStaffProfile(staff.id),
        payrollApi.listEmployeeDeductions(staff.id),
        payrollApi.advanceCheck(staff.id),
      ]);
      const p = profileRes.data.data.staff.profile;
      const profile = profileRes.data.data.staff;
      setForm({
        basicSalary: p ? Number(p.basicSalary) : profile.basicSalary,
        transportAllowance: p ? Number(p.transportAllowance) : 0,
        housingAllowance: p ? Number(p.housingAllowance) : 0,
        othersAllowance: p ? Number(p.othersAllowance) : 0,
        mealAllowance: p ? Number(p.mealAllowance) : 0,
        desiredNet: p?.desiredNet ? Number(p.desiredNet) : 0,
      });
      setDeductions(deductionsRes.data.data);
      setAdvanceMonthly(Number(advanceRes.data.data?.monthlyDeduction ?? 0));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load salary profile.'), 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [staff.id, toast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const hasManualRegister = Boolean(form.transportAllowance || form.housingAllowance || form.othersAllowance);
  const useTemplateRegister = template.allowanceRules.enabled && !hasManualRegister;

  const employeeDeductions = useMemo(() => {
    const rows = deductions.map((d) => ({ name: d.name, amount: d.amount, channel: 'tax' as const }));
    if (advanceMonthly > 0) {
      rows.push({ name: 'Shule Avance', amount: advanceMonthly, channel: 'tax' });
    }
    return rows;
  }, [deductions, advanceMonthly]);

  const deductionContext = useMemo(
    () => ({
      statutory: template.statutory,
      payeRates: template.payeRates,
      allowanceRules: template.allowanceRules,
      templateDeductions: template.templateDeductions,
      templateAllowances: template.templateAllowances,
      employeeDeductions,
    }),
    [template, employeeDeductions]
  );

  const netToGrossContext = useMemo(
    () => ({
      statutory: template.statutory,
      payeRates: template.payeRates,
      employeeDeductions,
    }),
    [template.statutory, template.payeRates, employeeDeductions]
  );

  const netToGrossSolved = useMemo(() => {
    if (mode !== 'netToGross' || form.desiredNet <= 0) return null;
    return solveNetToGrossPackage(form.desiredNet, netToGrossContext);
  }, [mode, form.desiredNet, netToGrossContext]);

  const calc = useMemo(() => {
    if (netToGrossSolved) return netToGrossSolved.calc;
    return calcRwandaPayroll({
      ...deductionContext,
      basicSalary: form.basicSalary,
      transport: form.transportAllowance,
      housing: form.housingAllowance,
      others: form.othersAllowance,
      meal: form.mealAllowance,
      autoAllowances: useTemplateRegister,
    });
  }, [form, deductionContext, netToGrossSolved, useTemplateRegister]);

  const totalAllowances = calc.housing + calc.transport + calc.others + form.mealAllowance;
  const totalDeductions = calc.gross - calc.netSalary;

  async function save() {
    if (mode === 'netToGross' && form.desiredNet <= 0) {
      toast.warning('Enter a desired net pay amount.', 'Required');
      return;
    }
    if (mode === 'normal' && form.basicSalary <= 0) {
      toast.warning('Enter a basic salary amount.', 'Required');
      return;
    }

    setSaving(true);
    try {
      const payload =
        mode === 'netToGross' && form.desiredNet > 0 && netToGrossSolved
          ? {
              basicSalary: netToGrossSolved.basic,
              transportAllowance: netToGrossSolved.transport,
              housingAllowance: netToGrossSolved.housing,
              othersAllowance: netToGrossSolved.others,
              mealAllowance: 0,
              otherAllowances: [],
              useNetToGross: true,
              desiredNet: form.desiredNet,
            }
          : {
              basicSalary: form.basicSalary,
              transportAllowance: useTemplateRegister ? 0 : form.transportAllowance,
              housingAllowance: useTemplateRegister ? 0 : form.housingAllowance,
              othersAllowance: useTemplateRegister ? 0 : form.othersAllowance,
              mealAllowance: form.mealAllowance,
              useNetToGross: false,
            };
      await toast.promise(payrollApi.saveStaffProfile(staff.id, payload), {
        loading: 'Saving salary package…',
        success: 'Salary package saved.',
        error: 'Save failed.',
      });
      setEditing(false);
      onSaved?.();
      await loadProfile();
    } catch (err) {
      if (!(err instanceof Error && err.message === 'Save failed.')) {
        toast.error(getApiErrorMessage(err, 'Save failed'), 'Error');
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    void loadProfile();
  }

  const registerDisplay = {
    transport: useTemplateRegister ? calc.transport : form.transportAllowance,
    housing: useTemplateRegister ? calc.housing : form.housingAllowance,
    others: useTemplateRegister ? calc.others : form.othersAllowance,
  };

  const earningsCards = [
    { key: 'basicSalary' as const, label: 'Basic Salary', value: form.basicSalary, editable: true },
    { key: 'housingAllowance' as const, label: 'Housing Allowance', value: registerDisplay.housing, fromTemplate: useTemplateRegister },
    { key: 'transportAllowance' as const, label: 'Transport Allowance', value: registerDisplay.transport, fromTemplate: useTemplateRegister },
    { key: 'othersAllowance' as const, label: 'Other Earnings', value: registerDisplay.others, fromTemplate: useTemplateRegister },
    { key: 'mealAllowance' as const, label: 'Meal Allowance', value: form.mealAllowance, editable: true },
    { label: 'Responsibility Allowance', value: 0 },
    { label: 'Medical Allowance', value: 0 },
    { label: 'Communication Allowance', value: 0 },
    { label: 'Overtime', value: 0 },
    { label: 'Bonus', value: 0 },
    { label: 'Commission', value: 0 },
  ];

  const statutoryDeductions = [
    { label: 'PAYE', amount: calc.paye },
    { label: 'RSSB Pension (CSR)', amount: calc.rssbEmployee },
    { label: 'RSSB Maternity', amount: calc.maternityEmployee },
    { label: 'Medical Insurance (RAMA)', amount: calc.ramaEmployee },
    { label: 'CBHI', amount: calc.cbhi },
  ];

  const customDeductions = [
    ...deductions.map((d) => ({ label: d.name, amount: d.amount })),
    ...(advanceMonthly > 0 ? [{ label: 'Shule Avance', amount: advanceMonthly }] : []),
  ];

  const benefitCards = [
    { label: 'Health Insurance', value: calc.ramaEmployee > 0 ? 'RAMA enrolled' : '—', amount: calc.ramaEmployee },
    { label: 'Pension', value: 'RSSB CSR', amount: calc.rssbEmployee },
    { label: 'Company Car', value: '—', amount: 0 },
    { label: 'Laptop', value: '—', amount: 0 },
    { label: 'Mobile Phone', value: '—', amount: 0 },
    { label: 'Fuel', value: '—', amount: 0 },
    { label: 'Airtime', value: '—', amount: 0 },
    { label: 'Accommodation', value: registerDisplay.housing > 0 ? 'Housing allowance' : '—', amount: registerDisplay.housing },
    { label: 'Other Benefits', value: '—', amount: 0 },
  ];

  const historyEvents = [
    staff.hireDate
      ? { date: staff.hireDate, title: 'Joined organization', detail: `${staff.department ?? '—'} · ${staff.position ?? '—'}` }
      : null,
    form.basicSalary > 0
      ? { date: new Date().toISOString(), title: 'Salary package configured', detail: `Basic ${formatRwf(form.basicSalary)}` }
      : null,
  ].filter(Boolean) as { date: string; title: string; detail: string }[];

  return (
    <div className={`flex h-full flex-col ${variant === 'drawer' ? 'bg-white' : ''}`}>
      {/* Header */}
      <div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-gradient-to-br from-[#000435]/[0.04] via-white to-[#FCB038]/[0.08] px-5 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <div className="scale-110 rounded-full shadow-[0_8px_24px_-8px_rgba(0,4,53,0.3)]">
              <AvatarInitials name={staff.fullName} seed={staff.id} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FCB038]">Employee Profile</p>
              <h2 className="truncate text-xl font-bold tracking-tight text-[#000435]">{staff.fullName}</h2>
              <p className="mt-0.5 font-mono text-xs font-semibold text-muted">{staff.employeeNumber}</p>
              <p className="mt-1 text-sm text-navy">
                {staff.position || '—'} <span className="text-slate-300">·</span> {staff.department || '—'}
              </p>
              <div className="mt-2">
                <StatusPill status={staff.status} />
              </div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white/80 p-2 text-muted transition hover:border-slate-300 hover:text-navy"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-4">
        <div className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DRAWER_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-[12px] px-3.5 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-[#000435] text-white shadow-sm'
                  : 'text-muted hover:bg-slate-50 hover:text-navy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[18px] bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-4">
                <InfoCard title="Personal Information" icon={<User size={16} />}>
                  <InfoRow label="Full Name" value={staff.fullName} />
                  <InfoRow label="Email" value={staff.email} />
                  <InfoRow label="Phone" value={staff.phone} />
                  <InfoRow label="Gender" value={staff.gender} />
                  <InfoRow label="National ID" value={staff.nationalId} />
                  <InfoRow
                    label="Date of Birth"
                    value={staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString() : null}
                  />
                </InfoCard>

                <InfoCard title="Employment Information" icon={<Briefcase size={16} />}>
                  <InfoRow label="Department" value={staff.department} />
                  <InfoRow label="Position" value={staff.position} />
                  <InfoRow label="Employment Type" value="Full-time" />
                  <InfoRow
                    label="Join Date"
                    value={staff.hireDate ? new Date(staff.hireDate).toLocaleDateString() : null}
                  />
                  <InfoRow label="Contract Type" value="Permanent" />
                  <InfoRow label="Salary Template" value={templateName} />
                </InfoCard>

                <div>
                  <SectionLabel icon={<Wallet size={14} className="text-[#FCB038]" />}>Payroll Summary</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <KpiCard label="Gross Salary" value={formatRwf(calc.gross)} />
                    <KpiCard label="Total Allowances" value={formatRwf(totalAllowances)} />
                    <KpiCard label="Total Deductions" value={formatRwf(totalDeductions)} />
                    <KpiCard label="Net Pay" value={formatRwf(calc.netSalary)} accent />
                  </div>
                </div>
              </div>
            )}

            {tab === 'earnings' && mode === 'netToGross' && (
              <div className="space-y-4">
                <SalaryPanel title="Net-to-Gross Calculator — Method 2 (70/10/10/10)">
                  <SalaryField label="Desired Net Salary (RWF)">
                    <div className="relative">
                      <Banknote size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FCB038]" />
                      <input
                        type="number"
                        className="input pl-10 text-lg font-bold tracking-tight"
                        value={form.desiredNet || ''}
                        onChange={(e) => setForm((f) => ({ ...f, desiredNet: Number(e.target.value) }))}
                      />
                    </div>
                  </SalaryField>
                  <p className="mt-2 text-xs text-muted">
                    Uses active template statutory + PAYE, plus advances and custom deductions. Split is fixed 70% basic / 10% each O·H·T.
                  </p>
                </SalaryPanel>

                {form.desiredNet > 0 && netToGrossSolved && (
                  <>
                    <div
                      className={`rounded-[18px] px-4 py-3 text-sm ${
                        netToGrossSolved.verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                      }`}
                    >
                      {netToGrossSolved.verified
                        ? `Net salary verified — ${formatRwf(calc.netSalary)} (within 1 RWF of target).`
                        : `Approximate match — difference ${formatRwf(Math.abs(calc.netSalary - form.desiredNet))}.`}
                    </div>
                    <SalaryPanel title="Solved Package">
                      <div className="divide-y divide-slate-100 text-sm">
                        {[
                          ['Desired Net', form.desiredNet],
                          ['Gross Salary', calc.gross],
                          ['Basic (70%)', calc.basicSalary],
                          ['Housing (10%)', calc.housing],
                          ['Transport (10%)', calc.transport],
                          ['Others (10%)', calc.others],
                          ['Verified Net', calc.netSalary],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="flex justify-between py-2.5">
                            <span className="text-muted">{label}</span>
                            <span className={`font-bold ${label === 'Verified Net' ? 'text-[#FCB038]' : 'text-navy'}`}>
                              {formatRwf(Number(value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SalaryPanel>
                  </>
                )}
                {form.desiredNet > 0 && !netToGrossSolved && (
                  <SalaryEmpty message="Could not solve — check that desired net is achievable with current deductions." />
                )}
              </div>
            )}

            {tab === 'earnings' && mode === 'normal' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionLabel icon={<Wallet size={14} className="text-[#FCB038]" />}>Earnings</SectionLabel>
                  {!editing ? (
                    <button type="button" className="btn-secondary !rounded-[14px] !py-2 !text-xs" onClick={() => setEditing(true)}>
                      <Pencil size={14} /> Edit
                    </button>
                  ) : (
                    <button type="button" className="btn-secondary !rounded-[14px] !py-2 !text-xs" onClick={cancelEdit}>
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {earningsCards.map((card) => {
                    const key = 'key' in card ? card.key : undefined;
                    const editable = 'editable' in card && card.editable;
                    return (
                      <AmountCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        editing={editing && Boolean(key && (editable || !useTemplateRegister))}
                        fromTemplate={'fromTemplate' in card ? card.fromTemplate : false}
                        onChange={
                          key
                            ? (v) => setForm((f) => ({ ...f, [key]: v }))
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                {!editing && useTemplateRegister && (
                  <p className="text-xs text-muted">
                    O/H/T follow Salary Template formulas. Click <strong>Edit</strong> to override manually.
                  </p>
                )}
              </div>
            )}

            {tab === 'deductions' && (
              <div className="space-y-4">
                <SectionLabel icon={<MinusCircle size={14} className="text-red-400" />}>Statutory Deductions</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {statutoryDeductions.map((d) => (
                    <AmountCard key={d.label} label={d.label} value={d.amount} />
                  ))}
                </div>
                {customDeductions.length > 0 && (
                  <>
                    <SectionLabel icon={<MinusCircle size={14} className="text-red-400" />}>Other Deductions</SectionLabel>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {customDeductions.map((d) => (
                        <AmountCard key={d.label} label={d.label} value={d.amount} />
                      ))}
                    </div>
                  </>
                )}
                {statutoryDeductions.every((d) => d.amount === 0) && customDeductions.length === 0 && (
                  <SalaryEmpty message="No deductions — configure basic salary first" />
                )}
              </div>
            )}

            {tab === 'benefits' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {benefitCards.map((b) => (
                  <div
                    key={b.label}
                    className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-[#FCB038]/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{b.label}</p>
                        <p className="mt-1 text-sm font-semibold text-navy">{b.value}</p>
                      </div>
                      <Gift size={16} className="shrink-0 text-[#FCB038]/60" />
                    </div>
                    {b.amount > 0 && (
                      <p className="mt-2 text-lg font-bold text-[#FCB038]">{formatRwf(b.amount)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'taxes' && (
              <div className="space-y-4">
                <SectionLabel icon={<Receipt size={14} className="text-[#FCB038]" />}>Tax & Statutory Breakdown</SectionLabel>
                <SalaryPanel title="Employee Taxes & Contributions">
                  <div className="divide-y divide-slate-100 text-sm">
                    {[
                      ['Taxable Income (Gross)', calc.gross],
                      ['PAYE', calc.paye],
                      ['RSSB CSR (Employee)', calc.rssbEmployee],
                      ['RSSB Maternity', calc.maternityEmployee],
                      ['RAMA (Employee)', calc.ramaEmployee],
                      ['CBHI', calc.cbhi],
                      ['Net Salary', calc.netSalary],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between py-2.5">
                        <span className="text-muted">{label}</span>
                        <span className="font-bold text-navy">{formatRwf(Number(value))}</span>
                      </div>
                    ))}
                  </div>
                </SalaryPanel>
                <SalaryPanel title="Employer Contributions">
                  <div className="divide-y divide-slate-100 text-sm">
                    {[
                      ['RSSB CSR (Employer)', calc.rssbEmployer],
                      ['RSSB Maternity (Employer)', calc.maternityEmployer],
                      ['RAMA (Employer)', calc.ramaEmployer],
                      ['Total Cost to Company', calc.employerCost],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between py-2.5">
                        <span className="text-muted">{label}</span>
                        <span className="font-bold text-navy">{formatRwf(Number(value))}</span>
                      </div>
                    ))}
                  </div>
                </SalaryPanel>
              </div>
            )}

            {tab === 'documents' && (
              <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white py-16 text-center">
                <FileText size={40} className="text-slate-300" />
                <p className="mt-4 font-semibold text-navy">No documents uploaded</p>
                <p className="mt-1 max-w-xs text-sm text-muted">Contracts, ID copies, and payroll letters will appear here.</p>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-0">
                {historyEvents.length === 0 ? (
                  <SalaryEmpty message="No salary history yet" />
                ) : (
                  historyEvents.map((ev, i) => (
                    <div key={i} className="relative flex gap-4 pb-6 pl-6 last:pb-0">
                      <div className="absolute left-0 top-1 h-full w-px bg-slate-200" />
                      <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#FCB038] ring-4 ring-[#FCB038]/20" />
                      <div className="min-w-0 flex-1 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Clock size={12} />
                          {new Date(ev.date).toLocaleDateString()}
                        </div>
                        <p className="mt-1 font-bold text-navy">{ev.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{ev.detail}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'audit' && (
              <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white py-16 text-center">
                <Shield size={40} className="text-slate-300" />
                <p className="mt-4 font-semibold text-navy">No audit entries</p>
                <p className="mt-1 max-w-xs text-sm text-muted">Changes to this employee&apos;s payroll package will be logged here.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom summary + actions */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:p-5">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SalaryMiniStat label="Gross" value={formatRwf(calc.gross).replace(' RWF', '')} />
          <SalaryMiniStat label="Deductions" value={formatRwf(totalDeductions).replace(' RWF', '')} />
          <SalaryMiniStat label="Net Pay" value={formatRwf(calc.netSalary).replace(' RWF', '')} accent />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-[14px] bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase text-muted">Taxable</p>
            <p className="text-xs font-bold text-navy">{formatRwf(calc.gross)}</p>
          </div>
          <div className="rounded-[14px] bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase text-muted">Employer</p>
            <p className="text-xs font-bold text-navy">{formatRwf(calc.employerCost - calc.gross)}</p>
          </div>
          <div className="col-span-2 rounded-[14px] bg-[#FCB038]/10 px-3 py-2 sm:col-span-1">
            <p className="text-[9px] font-bold uppercase text-muted">Cost to Co.</p>
            <p className="text-xs font-bold text-[#000435]">{formatRwf(calc.employerCost)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {onClose && (
            <button type="button" className="btn-secondary flex-1 !rounded-[14px]" onClick={onClose}>
              Close
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-1 !rounded-[14px]"
            onClick={() => void save()}
            disabled={saving || loading || (mode === 'normal' && !editing)}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                Saving…
              </span>
            ) : (
              <>
                <Save size={16} /> Save Package
              </>
            )}
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary flex-1 !rounded-[14px] !text-xs" disabled>
            <Receipt size={14} /> Preview Payslip
          </button>
          <Link
            href={`/employees/${staff.id}`}
            className="btn-secondary flex-1 !rounded-[14px] !text-xs"
          >
            <Building2 size={14} /> View Full Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarDays,
  Check,
  Crown,
  FileText,
  Handshake,
  Info,
  Laptop,
  Paperclip,
  Phone,
  Search,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { DynamicInputList, ListPreview } from '@/components/dynamic-input-list';
import { FormField, HrStepWizard, RadioGroup, SelectField } from '@/components/hr-step-wizard';
import { HrPageLayout } from '@/components/hr-page-layout';
import { useAuth } from '@/contexts/auth-context';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { captureTokenFromUrl, getToken } from '@/shared/auth-token';
import {
  COMPASSIONATE_EVENTS,
  ORGANIZATION_LEAVE_TYPES,
  STATUTORY_LEAVE_TYPES,
  type CompassionateEvent,
  type LeaveCategory,
  type LeavePolicy,
} from '@/types/leave';

/**
 * Register Leave wizard — same structural pattern as RegisterDepartmentView.
 *
 * NOTE: assumes these are added to `hrApi`:
 *   hrApi.leaveEmployeeLookup(query) -> { data: EmployeeSummary[] }
 *   hrApi.leaveBalance(employeeId, leaveType) -> { data: { balance, opening, earned, carryForward } }
 *   hrApi.publicHolidays(start, end) -> { data: string[] }  (ISO dates)
 *   hrApi.createLeaveRequest(payload)
 *   hrApi.updateLeaveRequest(id, payload)
 */

const STEPS = [
  { title: 'Employee', description: 'Who is requesting leave.' },
  { title: 'Leave Details', description: 'Category, type, reason and priority.' },
  { title: 'Leave Dates', description: 'Start, end and automatic day calculation.' },
  { title: 'Attachments', description: 'Supporting documents for this request.' },
  { title: 'Approval Workflow', description: 'Who needs to sign off.' },
  { title: 'Contact During Leave', description: 'How to reach the employee.' },
  { title: 'Handover', description: 'Coverage and returned assets.' },
  { title: 'Review & Submit', description: 'Confirm before submitting.' },
];

const NAVY = '#000435';
const AMBER = '#FCB038';

const modernFieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#000435] shadow-[0_1px_2px_rgba(0,4,53,0.03)] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#FCB038]/50 focus:ring-2 focus:ring-[#FCB038]/15';

const ORG_DOC_OPTIONS = ['Approval Letter', 'Supporting Document'];
const PRESET_ASSETS = ['Laptop', 'Keys', 'Vehicle', 'ID Card'] as const;

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  return [''];
}

function resolveAllowedDays(
  policy: LeavePolicy | undefined,
  compassionateEvent: CompassionateEvent | '',
  compassionateEntitlement: number | null
) {
  if (policy?.leaveType === 'Compassionate Leave' && compassionateEntitlement !== null) {
    return compassionateEntitlement;
  }
  return policy?.maxDays ?? 0;
}

interface EmployeeSummary {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  position: string;
  branch: string;
  manager: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  yearsOfService: number;
}

interface Props {
  requestId?: string;
  variant?: 'page' | 'modal';
  onClose?: () => void;
  onSuccess?: () => void;
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

function countWeekendDays(start: string, end: string) {
  if (!start || !end) return 0;
  let count = 0;
  const cur = new Date(start);
  const e = new Date(end);
  while (cur <= e) {
    const day = cur.getDay();
    if (day === 0 || day === 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** End date spanning exactly `workingDays` weekdays (optionally skipping public holidays). */
function computeEndDateFromWorkingDays(
  startDate: string,
  workingDays: number,
  holidays: ReadonlySet<string> = new Set()
) {
  if (!startDate || workingDays <= 0) return '';
  if (workingDays === 0.5) return startDate;

  let counted = 0;
  const cur = new Date(startDate);
  const limit = 366 * 3;

  for (let i = 0; i < limit; i += 1) {
    const day = cur.getDay();
    const iso = toIsoDate(cur);
    if (day !== 0 && day !== 6 && !holidays.has(iso)) {
      counted += 1;
      if (counted >= workingDays) return iso;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return '';
}

function EmployeeSearch({
  value,
  onSelect,
  employees,
}: {
  value: EmployeeSummary | null;
  onSelect: (e: EmployeeSummary) => void;
  employees: EmployeeSummary[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => employees.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20),
    [employees, query]
  );

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          value={value ? value.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search employee by name…"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(0,4,53,0.25)]">
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                onSelect(e);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span>
                <span className="font-semibold text-[#000435]">{e.name}</span>
                <span className="ml-2 text-xs text-slate-400">{e.position}</span>
              </span>
              {value?.id === e.id && <Check size={14} className="text-[#FCB038]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RegisterLeaveView({ requestId, variant = 'page', onClose, onSuccess }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { ready, authorized, reload } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [balance, setBalance] = useState<{ balance: number; opening: number; earned: number; carryForward: number } | null>(null);
  const [publicHolidayCount, setPublicHolidayCount] = useState(0);
  const [publicHolidayDates, setPublicHolidayDates] = useState<string[]>([]);
  const endDateManualRef = useRef(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [otherAssetDraft, setOtherAssetDraft] = useState('');

  const [form, setForm] = useState({
    leaveCategory: 'STATUTORY' as LeaveCategory,
    leaveType: 'Annual Leave',
    otherLeaveType: '',
    compassionateEvent: '' as CompassionateEvent | '',
    reason: '',
    priority: 'Normal' as 'Normal' | 'Urgent' | 'Critical',
    isHalfDay: false,
    halfDayPeriod: 'Morning' as 'Morning' | 'Afternoon',
    startDate: '',
    endDate: '',
    supervisor: '',
    hrOfficer: '',
    departmentHead: '',
    ceoRequired: false,
    contactPhone: '',
    contactEmail: '',
    temporaryAddress: '',
    emergencyContact: '',
    canBeContacted: true,
    handoverPerson: '',
    tasksToComplete: [''] as string[],
    pendingWork: [''] as string[],
    assetsReturned: [] as string[],
    customAssets: [] as string[],
  });

  useEffect(() => {
    if (!ready || !authorized) return;

    captureTokenFromUrl();
    hrApi
      .leavePolicies()
      .then(({ data }) => setPolicies(data.data.filter((p) => p.active)))
      .catch(() => undefined);

    hrApi
      .leaveEmployeeLookup('')
      .then(({ data }) => setEmployees(data.data as EmployeeSummary[]))
      .catch((err: unknown) => {
        toast.error(getApiErrorMessage(err, 'Failed to load employees.'), 'Load failed');
      });

    if (requestId) {
      hrApi
        .getLeaveRequest(requestId)
        .then(({ data }) => {
          const payload = data.data as {
            employee: EmployeeSummary;
            form: Partial<typeof form> & {
              tasksToComplete?: string[] | string;
              pendingWork?: string[] | string;
              customAssets?: string[];
            };
          };
          setSelectedEmployee(payload.employee);
          setForm((f) => ({
            ...f,
            ...payload.form,
            tasksToComplete: normalizeList(payload.form.tasksToComplete),
            pendingWork: normalizeList(payload.form.pendingWork),
            customAssets: payload.form.customAssets ?? [],
            assetsReturned: (payload.form.assetsReturned ?? []).filter((a) =>
              PRESET_ASSETS.includes(a as (typeof PRESET_ASSETS)[number])
            ),
          }));
        })
        .catch(() => undefined);
    }
  }, [authorized, ready, requestId, toast]);

  useEffect(() => {
    if (!ready || !authorized || !selectedEmployee || !form.leaveType) {
      if (!selectedEmployee || !form.leaveType) setBalance(null);
      return;
    }
    hrApi
      .leaveBalance(selectedEmployee.id, form.leaveType)
      .then(({ data }) => setBalance(data.data))
      .catch(() => setBalance(null));
  }, [authorized, form.leaveType, ready, selectedEmployee]);

  useEffect(() => {
    if (!ready || !authorized || !form.startDate || !form.endDate) {
      if (!form.startDate || !form.endDate) {
        setPublicHolidayCount(0);
        setPublicHolidayDates([]);
      }
      return;
    }
    hrApi
      .publicHolidays(form.startDate, form.endDate)
      .then(({ data }) => {
        setPublicHolidayCount(data.data.length);
        setPublicHolidayDates(data.data);
      })
      .catch(() => {
        setPublicHolidayCount(0);
        setPublicHolidayDates([]);
      });
  }, [authorized, form.endDate, form.startDate, ready]);

  useEffect(() => {
    if (!selectedEmployee?.manager || selectedEmployee.manager === '—') return;
    setForm((f) => (f.supervisor.trim() ? f : { ...f, supervisor: selectedEmployee.manager }));
  }, [selectedEmployee]);

  useEffect(() => {
    endDateManualRef.current = false;
  }, [form.leaveCategory, form.leaveType, form.compassionateEvent]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function switchCategory(category: LeaveCategory) {
    const firstType =
      policies.find((p) => p.category === category)?.leaveType ??
      (category === 'STATUTORY' ? STATUTORY_LEAVE_TYPES[0] : ORGANIZATION_LEAVE_TYPES[0]);
    setForm((f) => ({
      ...f,
      leaveCategory: category,
      leaveType: firstType,
      otherLeaveType: '',
      compassionateEvent: '',
    }));
  }

  function toggleAsset(asset: string) {
    setForm((f) => ({
      ...f,
      assetsReturned: f.assetsReturned.includes(asset)
        ? f.assetsReturned.filter((a) => a !== asset)
        : [...f.assetsReturned, asset],
    }));
  }

  function addCustomAsset() {
    const name = otherAssetDraft.trim();
    if (!name) return;
    setForm((f) => ({
      ...f,
      customAssets: f.customAssets.includes(name) ? f.customAssets : [...f.customAssets, name],
    }));
    setOtherAssetDraft('');
  }

  function removeCustomAsset(name: string) {
    setForm((f) => ({
      ...f,
      customAssets: f.customAssets.filter((a) => a !== name),
    }));
  }

  function addAttachments(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  const totalCalendarDays = daysBetween(form.startDate, form.endDate);
  const weekendDays = countWeekendDays(form.startDate, form.endDate);
  const workingDays = form.isHalfDay
    ? Math.max(0, totalCalendarDays - weekendDays - publicHolidayCount) - 0.5
    : Math.max(0, totalCalendarDays - weekendDays - publicHolidayCount);
  const returnDate = useMemo(() => {
    if (!form.endDate) return '';
    const d = new Date(form.endDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [form.endDate]);

  const isMedicalCertRequired = form.leaveType === 'Sick Leave';
  const isMaternity = form.leaveType === 'Maternity Leave';
  const isPaternity = form.leaveType === 'Paternity Leave';
  const isCompassionate = form.leaveType === 'Compassionate Leave';
  const isLongSickLeave = isMedicalCertRequired && workingDays > 15;

  const resolvedLeaveType = form.leaveType === 'Other' ? form.otherLeaveType.trim() : form.leaveType;
  const activePoliciesForCategory = policies.filter((p) => p.category === form.leaveCategory);
  const leaveTypeOptions =
    activePoliciesForCategory.length > 0
      ? activePoliciesForCategory.map((p) => p.leaveType)
      : form.leaveCategory === 'STATUTORY'
        ? [...STATUTORY_LEAVE_TYPES]
        : [...ORGANIZATION_LEAVE_TYPES];
  const selectedPolicy = policies.find(
    (p) => p.leaveType === resolvedLeaveType && p.category === form.leaveCategory
  );
  const compassionateEntitlement = useMemo(
    () => COMPASSIONATE_EVENTS.find((c) => c.event === form.compassionateEvent)?.days ?? null,
    [form.compassionateEvent]
  );
  const allowedDays = resolveAllowedDays(selectedPolicy, form.compassionateEvent, compassionateEntitlement);
  const countedWorkingDays = Math.round(workingDays * 10) / 10;
  const daysMismatch =
    allowedDays > 0 && form.startDate && form.endDate && countedWorkingDays !== allowedDays;
  const daysMismatchMessage =
    allowedDays > 0 && countedWorkingDays !== allowedDays
      ? countedWorkingDays > allowedDays
        ? `Reduce your dates by ${countedWorkingDays - allowedDays} working day(s).`
        : `Increase your dates by ${allowedDays - countedWorkingDays} working day(s).`
      : '';

  useEffect(() => {
    if (endDateManualRef.current) return;
    if (!form.startDate || allowedDays <= 0) return;
    if (isCompassionate && compassionateEntitlement === null) return;

    const holidays = new Set(publicHolidayDates);
    const computed = computeEndDateFromWorkingDays(form.startDate, allowedDays, holidays);
    if (!computed) return;

    setForm((f) => (f.endDate === computed ? f : { ...f, endDate: computed }));
  }, [
    allowedDays,
    compassionateEntitlement,
    form.startDate,
    isCompassionate,
    publicHolidayDates,
  ]);

  function handleStartDateChange(value: string) {
    endDateManualRef.current = false;
    update('startDate', value);
  }

  function handleEndDateChange(value: string) {
    endDateManualRef.current = true;
    update('endDate', value);
  }

  async function submit() {
    if (!selectedEmployee) {
      toast.warning('Select an employee to continue.', 'Required field');
      setStep(0);
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.warning('Start and end dates are required.', 'Required field');
      setStep(2);
      return;
    }
    if (daysMismatch) {
      toast.warning(
        `This leave type requires exactly ${allowedDays} working day(s). You selected ${countedWorkingDays}. ${daysMismatchMessage}`,
        'Dates do not match policy'
      );
      setStep(2);
      return;
    }
    if (!form.supervisor.trim()) {
      toast.warning('Immediate supervisor is required.', 'Required field');
      setStep(4);
      return;
    }

    captureTokenFromUrl();
    if (!authorized || !getToken()) {
      await reload();
    }
    if (!getToken()) {
      toast.error('Session expired. Reopen HR from your organization dashboard.', 'Authentication required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeId: selectedEmployee.id,
        leaveCategory: form.leaveCategory,
        leaveType: resolvedLeaveType,
        compassionateEvent: isCompassionate ? form.compassionateEvent : null,
        reason: form.reason,
        priority: form.priority,
        isHalfDay: form.isHalfDay,
        halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : null,
        startDate: form.startDate,
        endDate: form.endDate,
        returnDate,
        workingDays,
        approval: {
          supervisor: form.supervisor,
          hrOfficer: form.hrOfficer,
          departmentHead: form.departmentHead,
          ceoRequired: form.ceoRequired,
        },
        contact: {
          phone: form.contactPhone,
          email: form.contactEmail,
          temporaryAddress: form.temporaryAddress,
          emergencyContact: form.emergencyContact,
          canBeContacted: form.canBeContacted,
        },
        handover: {
          person: form.handoverPerson,
          tasksToComplete: form.tasksToComplete.map((t) => t.trim()).filter(Boolean),
          pendingWork: form.pendingWork.map((t) => t.trim()).filter(Boolean),
          assetsReturned: form.assetsReturned,
          customAssets: form.customAssets,
        },
      };

      if (requestId) {
        await hrApi.updateLeaveRequest(requestId, payload);
        toast.success('Leave request updated.', 'Saved');
      } else {
        await hrApi.createLeaveRequest(payload);
        toast.success(`Leave request for ${selectedEmployee.name} submitted.`, 'Submitted');
      }
      if (variant === 'modal') {
        onSuccess?.();
        onClose?.();
      } else {
        router.push('/leave');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to submit leave request.'), 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  const wizard = (
    <HrStepWizard
      steps={STEPS}
      currentStep={step}
      onStepClick={setStep}
      onCancel={() => (variant === 'modal' ? onClose?.() : router.push('/leave'))}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => setStep((s) => s + 1)}
      onSubmit={submit}
      isLastStep={step === STEPS.length - 1}
      saving={saving}
      submitLabel={requestId ? 'Save Changes' : 'Submit Request'}
    >
      {step === 0 && (
        <div className="space-y-6">
          <FormField label="Employee" required>
            <EmployeeSearch value={selectedEmployee} onSelect={setSelectedEmployee} employees={employees} />
          </FormField>

          {selectedEmployee ? (
            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
              {[
                { label: 'Employee ID', value: selectedEmployee.employeeId },
                { label: 'Department', value: selectedEmployee.department },
                { label: 'Position', value: selectedEmployee.position },
                { label: 'Branch', value: selectedEmployee.branch },
                { label: 'Manager', value: selectedEmployee.manager },
                { label: 'Years of Service', value: `${selectedEmployee.yearsOfService} yrs` },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{row.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#000435]">{row.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
              Search and select an employee to auto-fill their details.
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <FormField label="Leave Category" required>
            <RadioGroup
              name="leaveCategory"
              value={form.leaveCategory}
              onChange={(v) => switchCategory(v as LeaveCategory)}
              options={[
                { value: 'STATUTORY', label: 'Statutory Leave (Rwanda labour law)' },
                { value: 'ORGANIZATION', label: 'Organization Leave (company policy)' },
              ]}
            />
          </FormField>

          <SelectField
            label="Leave Type"
            required
            value={form.leaveType}
            onChange={(v) => update('leaveType', v)}
            options={leaveTypeOptions.map((t) => ({ value: t, label: t }))}
            placeholder="Select leave type"
          />

          {selectedPolicy ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#FCB038]/30 bg-[#FCB038]/10 px-4 py-3 text-xs font-bold text-[#946207]">
              <ShieldCheck size={14} />
              Policy: {allowedDays > 0 ? `${allowedDays} working day(s) required` : 'Flexible duration (no fixed day limit)'}
              {selectedPolicy.maxDays > 0 ? ` · Max ${selectedPolicy.maxDays} days` : ''}
            </div>
          ) : null}

          {form.leaveType === 'Other' && (
            <FormField label="Specify Leave Type" required>
              <input
                className="input"
                value={form.otherLeaveType}
                onChange={(e) => update('otherLeaveType', e.target.value)}
                placeholder="Enter custom leave type"
              />
            </FormField>
          )}

          {isCompassionate && (
            <FormField label="Compassionate Event" required>
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectField
                  label=""
                  value={form.compassionateEvent}
                  onChange={(v) => update('compassionateEvent', v as CompassionateEvent)}
                  options={COMPASSIONATE_EVENTS.map((c) => ({ value: c.event, label: c.event }))}
                  placeholder="Select event"
                />
                {compassionateEntitlement !== null && (
                  <div className="flex items-center gap-2 rounded-xl bg-[#FCB038]/10 px-3.5 py-2.5 text-xs font-bold text-[#946207]">
                    <ShieldCheck size={14} />
                    {compassionateEntitlement} paid day{compassionateEntitlement === 1 ? '' : 's'} required
                  </div>
                )}
              </div>
            </FormField>
          )}

          {balance && (
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-100 bg-white p-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Available Balance</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#000435]">{balance.balance} days</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Opening Balance</p>
                <p className="mt-0.5 text-sm font-bold text-slate-500">{balance.opening} days</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Carry Forward</p>
                <p className="mt-0.5 text-sm font-bold text-slate-500">{balance.carryForward} days</p>
              </div>
            </div>
          )}

          <FormField label="Reason" required>
            <textarea
              className="input min-h-[110px]"
              value={form.reason}
              onChange={(e) => update('reason', e.target.value)}
              placeholder="Briefly describe the reason for this leave request…"
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Priority">
              <RadioGroup
                name="priority"
                value={form.priority}
                onChange={(v) => update('priority', v as typeof form.priority)}
                options={[
                  { value: 'Normal', label: 'Normal' },
                  { value: 'Urgent', label: 'Urgent' },
                  { value: 'Critical', label: 'Critical' },
                ]}
              />
            </FormField>
            <FormField label="Half Day?">
              <RadioGroup
                name="isHalfDay"
                value={form.isHalfDay ? 'Yes' : 'No'}
                onChange={(v) => update('isHalfDay', v === 'Yes')}
                options={[
                  { value: 'No', label: 'No' },
                  { value: 'Yes', label: 'Yes' },
                ]}
              />
              {form.isHalfDay && (
                <div className="mt-3">
                  <RadioGroup
                    name="halfDayPeriod"
                    value={form.halfDayPeriod}
                    onChange={(v) => update('halfDayPeriod', v as typeof form.halfDayPeriod)}
                    options={[
                      { value: 'Morning', label: 'Morning' },
                      { value: 'Afternoon', label: 'Afternoon' },
                    ]}
                  />
                </div>
              )}
            </FormField>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Start Date" required>
              <input type="date" className="input" value={form.startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
            </FormField>
            <FormField label="End Date" required>
              <input type="date" className="input" value={form.endDate} onChange={(e) => handleEndDateChange(e.target.value)} min={form.startDate || undefined} />
            </FormField>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#000435]">
              <CalendarDays size={14} /> Automatic Calculation
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Leave Requested</p>
                <p className="mt-0.5 text-sm font-bold text-[#000435]">{totalCalendarDays} days</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Weekend Days</p>
                <p className="mt-0.5 text-sm font-bold text-slate-500">{weekendDays} days</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Public Holidays</p>
                <p className="mt-0.5 text-sm font-bold text-slate-500">{publicHolidayCount} days</p>
              </div>
              <div className="rounded-xl bg-[#FCB038]/15 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#946207]">Working Days Counted</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#000435]">{workingDays}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Return date: <span className="font-bold text-[#000435]">{returnDate || '—'}</span>
            </p>
            {allowedDays > 0 ? (
              <p className="mt-2 text-xs font-semibold text-[#946207]">
                Policy requires exactly <span className="font-bold">{allowedDays}</span> working day(s) for this leave type.
              </p>
            ) : null}
          </div>

          {daysMismatch ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p>
                  Working days ({countedWorkingDays}) do not match the policy ({allowedDays} days required).
                </p>
                <p className="mt-1">{daysMismatchMessage}</p>
              </div>
            </div>
          ) : null}

          {!daysMismatch && allowedDays > 0 && form.startDate && form.endDate ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
              <Check size={16} className="mt-0.5 shrink-0" />
              Dates match the policy: {allowedDays} working day(s).
            </div>
          ) : null}

          {isLongSickLeave && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              This sick leave exceeds 15 consecutive working days. It has been flagged for additional HR review — the
              first 3 months are paid, the following 3 months unpaid, subject to legal and medical certification.
            </div>
          )}

          {isMaternity && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
              <Info size={16} className="mt-0.5 shrink-0 text-[#000435]" />
              Default maternity leave is 14 weeks. If complications are recorded, HR can extend this in accordance
              with the law and RSSB requirements.
            </div>
          )}

          {isPaternity && workingDays > 4 && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Paternity leave defaults to 4 working days. This request exceeds that and needs additional
              organizational approval.
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {isMedicalCertRequired && (
            <FormField label="Medical Certificate" required hint="Required for Sick Leave.">
              <AttachmentUpload files={attachments} onAdd={addAttachments} onRemove={(i) => setAttachments((p) => p.filter((_, idx) => idx !== i))} />
            </FormField>
          )}
          {isCompassionate && (
            <FormField label="Death / Marriage / Birth Certificate" hint="Optional — attach the relevant supporting certificate.">
              <AttachmentUpload files={attachments} onAdd={addAttachments} onRemove={(i) => setAttachments((p) => p.filter((_, idx) => idx !== i))} />
            </FormField>
          )}
          {!isMedicalCertRequired && !isCompassionate && (
            <FormField label="Supporting Documents" hint="Approval letters or other supporting documents (PDF, DOCX, images).">
              <AttachmentUpload files={attachments} onAdd={addAttachments} onRemove={(i) => setAttachments((p) => p.filter((_, idx) => idx !== i))} />
            </FormField>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#FCB038]/25 bg-gradient-to-br from-[#FCB038]/10 via-white to-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#000435] text-[#FCB038]">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#000435]">Approval workflow</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                  Assign reviewers for this leave request. Immediate supervisor is required; HR officer and other
                  approvers are optional unless your policy needs them.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-[0_1px_2px_rgba(0,4,53,0.03)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#000435]/8 text-[#000435]">
                  <UserCheck size={15} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">
                    Immediate Supervisor <span className="text-red-500">*</span>
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">First line approver</p>
                </div>
              </div>
              <input
                className={modernFieldClass}
                value={form.supervisor}
                onChange={(e) => update('supervisor', e.target.value)}
                placeholder={selectedEmployee?.manager && selectedEmployee.manager !== '—' ? selectedEmployee.manager : 'Supervisor full name'}
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-[0_1px_2px_rgba(0,4,53,0.03)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCB038]/15 text-[#946207]">
                  <Users size={15} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">HR Officer</p>
                  <p className="text-[10px] font-medium text-slate-400">Optional</p>
                </div>
              </div>
              <input
                className={modernFieldClass}
                value={form.hrOfficer}
                onChange={(e) => update('hrOfficer', e.target.value)}
                placeholder="HR officer name (optional)"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-[0_1px_2px_rgba(0,4,53,0.03)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/60 text-slate-600">
                  <Briefcase size={15} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">Department Head</p>
                  <p className="text-[10px] font-medium text-slate-400">Optional</p>
                </div>
              </div>
              <input
                className={modernFieldClass}
                value={form.departmentHead}
                onChange={(e) => update('departmentHead', e.target.value)}
                placeholder="Department head name (optional)"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-[0_1px_2px_rgba(0,4,53,0.03)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#000435]/8 text-[#000435]">
                  <Crown size={15} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">CEO Approval</p>
                  <p className="text-[10px] font-medium text-slate-400">For extended or executive leave</p>
                </div>
              </div>
              <RadioGroup
                name="ceoRequired"
                value={form.ceoRequired ? 'Yes' : 'No'}
                onChange={(v) => update('ceoRequired', v === 'Yes')}
                options={[
                  { value: 'No', label: 'Not required' },
                  { value: 'Yes', label: 'Required' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Phone">
              <input className="input" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} placeholder="+250…" />
            </FormField>
            <FormField label="Email">
              <input type="email" className="input" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} placeholder="name@company.com" />
            </FormField>
            <FormField label="Temporary Address" className="sm:col-span-2">
              <input className="input" value={form.temporaryAddress} onChange={(e) => update('temporaryAddress', e.target.value)} placeholder="Optional" />
            </FormField>
            <FormField label="Emergency Contact" className="sm:col-span-2">
              <input className="input" value={form.emergencyContact} onChange={(e) => update('emergencyContact', e.target.value)} placeholder="Name and phone number" />
            </FormField>
          </div>
          <FormField label="Can Employee Be Contacted During Leave?">
            <RadioGroup
              name="canBeContacted"
              value={form.canBeContacted ? 'Yes' : 'No'}
              onChange={(v) => update('canBeContacted', v === 'Yes')}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]}
            />
          </FormField>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6">
          <FormField label="Person Taking Responsibilities">
            <input className="input" value={form.handoverPerson} onChange={(e) => update('handoverPerson', e.target.value)} placeholder="Name of covering employee" />
          </FormField>
          <FormField label="Tasks to Complete Before Leave">
            <DynamicInputList
              items={form.tasksToComplete}
              onChange={(items) => update('tasksToComplete', items)}
              placeholder="Describe a task to finish before leave…"
              addLabel="Add another task"
            />
          </FormField>
          <FormField label="Pending Work / Handover Notes">
            <DynamicInputList
              items={form.pendingWork}
              onChange={(items) => update('pendingWork', items)}
              placeholder="Describe pending work or handover note…"
              addLabel="Add another note"
            />
          </FormField>
          <FormField label="Company Assets Returned">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESET_ASSETS.map((asset) => {
                  const active = form.assetsReturned.includes(asset);
                  return (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => toggleAsset(asset)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                        active ? 'border-[#FCB038] bg-[#FCB038]/10 text-[#000435]' : 'border-slate-200 bg-white text-slate-500 hover:border-[#FCB038]/40'
                      }`}
                    >
                      {active && <Check size={12} />}
                      {asset}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Other assets</p>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={otherAssetDraft}
                    onChange={(e) => setOtherAssetDraft(e.target.value)}
                    placeholder="Type asset name and click Add"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAsset();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomAsset}
                    className="shrink-0 rounded-xl bg-[#000435] px-3.5 py-2 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </div>
                {form.customAssets.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {form.customAssets.map((asset) => (
                      <li key={asset} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-[#000435]">
                        <span>{asset}</span>
                        <button type="button" onClick={() => removeCustomAsset(asset)} className="text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </FormField>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-[#FCB038]/20 bg-[#000435] p-6 text-white shadow-[0_16px_32px_-12px_rgba(0,4,53,0.45)] lg:w-64 lg:shrink-0">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FCB038]/15 text-[#FCB038]">
                <CalendarDays size={28} />
              </span>
              <h4 className="mt-4 text-center text-base font-bold leading-tight">{selectedEmployee?.name ?? 'No employee selected'}</h4>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#FCB038]">
                {form.leaveType === 'Other' ? form.otherLeaveType || 'Other' : form.leaveType}
              </p>
              <span className="mt-4 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                {requestId ? 'Updating request' : 'New request'}
              </span>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <SummarySection
                icon={<Users size={14} />}
                title="Employee"
                rows={[
                  { label: 'Department', value: selectedEmployee?.department || '—' },
                  { label: 'Manager', value: selectedEmployee?.manager || '—' },
                ]}
              />
              <SummarySection
                icon={<Briefcase size={14} />}
                title="Leave Details"
                rows={[
                  { label: 'Category', value: form.leaveCategory === 'STATUTORY' ? 'Statutory' : 'Organization' },
                  { label: 'Policy Days', value: allowedDays > 0 ? `${allowedDays} working days` : 'Flexible' },
                  { label: 'Priority', value: form.priority },
                ]}
              />
              <SummarySection
                icon={<Calendar size={14} />}
                title="Dates"
                rows={[
                  { label: 'Start → End', value: `${form.startDate || '—'} → ${form.endDate || '—'}` },
                  { label: 'Working Days', value: `${countedWorkingDays}${allowedDays > 0 ? ` / ${allowedDays} required` : ''}` },
                ]}
              />
              <SummarySection
                icon={<Paperclip size={14} />}
                title="Attachments"
                rows={[{ label: 'Files', value: attachments.length ? `${attachments.length} file(s)` : 'None' }]}
              />
              <SummarySection
                icon={<ShieldCheck size={14} />}
                title="Approval"
                rows={[
                  { label: 'Supervisor', value: form.supervisor || '—' },
                  { label: 'HR Officer', value: form.hrOfficer || '—' },
                ]}
              />
              <SummarySection
                icon={<Handshake size={14} />}
                title="Handover"
                rows={[
                  { label: 'Covering', value: form.handoverPerson || '—' },
                  {
                    label: 'Tasks Before Leave',
                    value: <ListPreview items={form.tasksToComplete} />,
                  },
                  {
                    label: 'Pending Work',
                    value: <ListPreview items={form.pendingWork} />,
                  },
                  {
                    label: 'Assets Returned',
                    value: (
                      <div className="flex flex-wrap gap-1.5">
                        {[...form.assetsReturned, ...form.customAssets].length ? (
                          [...form.assetsReturned, ...form.customAssets].map((asset) => (
                            <span
                              key={asset}
                              className="inline-flex rounded-full border border-[#FCB038]/30 bg-[#FCB038]/10 px-2.5 py-1 text-[11px] font-bold text-[#946207]"
                            >
                              {asset}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">None</span>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </HrStepWizard>
  );

  if (variant === 'modal') {
    return <div className="px-1 py-1">{wizard}</div>;
  }

  return <HrPageLayout>{wizard}</HrPageLayout>;
}

function AttachmentUpload({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center transition-colors hover:border-[#FCB038]/50 hover:bg-[#FCB038]/5 focus-within:ring-2 focus-within:ring-[#FCB038] focus-within:ring-offset-2">
        <Upload size={18} className="text-[#FCB038]" />
        <span className="text-sm font-semibold text-[#000435]">Attach PDF, DOCX or image files</span>
        <input type="file" multiple accept=".pdf,.doc,.docx,image/*" className="sr-only" onChange={(e) => onAdd(e.target.files)} />
      </label>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000435]/[0.06] text-[#000435]">
                  <FileText size={14} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#000435]">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button type="button" onClick={() => onRemove(i)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${file.name}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummarySection({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#000435]/[0.06] text-[#000435]">{icon}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">{title}</h3>
      </div>
      <dl className="grid gap-x-6 gap-y-4 px-4 py-4 text-xs sm:grid-cols-2 sm:px-5">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{row.label}</dt>
            <dd className="mt-1 text-sm font-bold text-[#000435]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
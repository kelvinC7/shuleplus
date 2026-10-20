'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Eye as EyeIcon,
  FileText,
  Grid3x3,
  Info,
  Layers,
  Link2,
  MapPin,
  Paperclip,
  Phone,
  Search,
  Tag as TagIcon,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { FormField, HrStepWizard, RadioGroup, SelectField } from '@/components/hr-step-wizard';
import { HrPageLayout } from '@/components/hr-page-layout';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { Department } from '@/types';

/**
 * Department registration wizard — loads departments, employees, and categories from HR API.
 */

const STEPS = [
  { title: 'Basic Information', description: 'Name, code, type and category.' },
  { title: 'Structure & Leadership', description: 'Hierarchy, reporting line and department leaders.' },
  { title: 'Contact & Location', description: 'Communication channels and physical location.' },
  { title: 'Operations', description: 'Working schedule and staffing capacity.' },
  { title: 'Tags & Documents', description: 'Auto-generated tags, description and attachments.' },
  { title: 'Settings', description: 'Status, visibility, effective dates and notifications.' },
  { title: 'Review & Submit', description: 'Review all details before creating the department.' },
];

const DEPARTMENT_LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const ORGANIZATIONAL_UNITS = [
  'Headquarters', 'Regional Office', 'Branch Office', 'Campus', 'Factory', 'Warehouse', 'Field Office',
];

const WORKING_SCHEDULES = ['Full Time', 'Shift Based', 'Hybrid', 'Remote', 'Flexible'];

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending Approval', 'Archived'];

const VISIBILITY_OPTIONS = [
  { value: 'EVERYONE', label: 'Visible to everyone' },
  { value: 'MANAGERS', label: 'Managers only' },
  { value: 'HR', label: 'HR only' },
  { value: 'CUSTOM', label: 'Custom access' },
];

function generateTagsFromDepartmentName(
  name: string,
  departmentType?: string,
  departmentCategory?: string
): string[] {
  const words = name
    .replace(/[()]/g, ' ')
    .split(/[\s,&/+\-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  const tags = words.map((w) =>
    w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );

  if (departmentType) tags.push(departmentType);
  if (departmentCategory) tags.push(departmentCategory);

  return Array.from(new Set(tags)).slice(0, 10);
}

function buildAutoDepartmentCode(name: string, numericSuffix?: string) {
  const letter = name.trim()[0]?.toUpperCase() ?? '';
  if (!letter) return '';
  const suffix = numericSuffix ?? String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letter}${suffix}`;
}

interface EmployeeOption {
  id: string;
  name: string;
  position?: string;
}

interface Props {
  departmentId?: string;
  variant?: 'page' | 'modal';
  onClose?: () => void;
  onSuccess?: (department: Department) => void;
}

/* ---------- Reusable pieces ---------- */

type ComboboxItem = { value: string; label: string; key: string };

function normalizeComboboxOptions(options: string[]): ComboboxItem[] {
  const items: ComboboxItem[] = [];
  const seen = new Map<string, number>();

  for (const raw of options) {
    const value = raw.trim();
    if (!value) continue;
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    items.push({
      value,
      label: value,
      key: count === 0 ? value : `${value}-${count}`,
    });
  }

  return items;
}

function Combobox({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = 'Type or select…',
  hint,
  className = '',
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const normalizedOptions = useMemo(() => normalizeComboboxOptions(options), [options]);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () =>
      normalizedOptions
        .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 30),
    [normalizedOptions, query]
  );

  function commit(val: string) {
    onChange(val);
    setQuery(val);
    setOpen(false);
  }

  return (
    <FormField label={label} required={required} className={className}>
      <div className="relative" ref={ref}>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
          />
        </div>
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(0,4,53,0.25)]">
            {filtered.map((item) => (
              <button
                key={item.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(item.value)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  value === item.value ? 'bg-[#FCB038]/10 font-semibold text-[#000435]' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
                {value === item.value && <Check size={14} className="text-[#FCB038]" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </FormField>
  );
}

function AutoTagsPreview({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      {tags.length ? (
        tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center rounded-full bg-[#000435]/[0.06] px-3 py-1 text-xs font-semibold text-[#000435]"
          >
            {tag}
          </span>
        ))
      ) : (
        <p className="text-sm text-slate-400">Tags will appear when you enter a department name.</p>
      )}
    </div>
  );
}

function AttachmentList({
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
        <span className="text-sm font-semibold text-[#000435]">
          Attach organization chart, SOPs, policies or budget files
        </span>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,image/*"
          className="sr-only"
          onChange={(e) => onAdd(e.target.files)}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000435]/[0.06] text-[#000435]">
                  <Paperclip size={14} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#000435]">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummarySection({
  icon,
  title,
  rows,
}: {
  icon: ReactNode;
  title: string;
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#000435]/[0.06] text-[#000435]">
          {icon}
        </span>
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

/* ---------- Main view ---------- */

export function RegisterDepartmentView({
  departmentId,
  variant = 'page',
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: '', code: '', autoGenerateCode: true,
    departmentType: '', departmentCategory: '',
    parentDepartment: '', reportsTo: '', departmentLevel: '', organizationalUnit: '',
    departmentHead: '', assistantManager: '', actingHead: '', departmentSecretary: '',
    officialEmail: '', phoneNumber: '', extension: '', whatsappNumber: '', website: '',
    branch: '', building: '', floor: '', officeNumber: '', physicalAddress: '',
    costCenter: '', budgetCode: '', annualBudget: '', currency: 'RWF', expenseCategory: '',
    maxEmployees: '', minEmployees: '',
    workingSchedule: '', workingDays: [] as string[], startTime: '', endTime: '',
    accessModules: [] as string[],
    tags: [] as string[], description: '',
    status: 'Active', effectiveStartDate: '', effectiveEndDate: '',
    visibility: 'EVERYONE',
    notifyDepartmentHead: true, notifyHR: true, notifyEmployees: false, sendEmail: true, sendSMS: false,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const codeSuffixRef = useRef(String(Math.floor(Math.random() * 10000)).padStart(4, '0'));
  const codeLetterRef = useRef('');

  useEffect(() => {
    hrApi.departments().then(({ data }) => setDepartments(data.data)).catch(() => undefined);
    hrApi
      .directory({ limit: '200' })
      .then(({ data }) =>
        setEmployees(
          data.data.map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            position: e.position,
          }))
        )
      )
      .catch(() => undefined);
    hrApi
      .categories()
      .then(({ data }) => setCategoryOptions(data.categories.map((c) => c.name)))
      .catch(() => undefined);

    if (departmentId) {
      hrApi
        .getDepartment(departmentId)
        .then(({ data }) => {
          const d = data.data;
          const profile = d.departmentProfile ?? {};
          setForm((f) => ({
            ...f,
            name: d.name,
            code: d.code ?? '',
            autoGenerateCode: false,
            departmentType: d.departmentType ?? '',
            departmentCategory: String(profile.departmentCategory ?? ''),
            parentDepartment: d.parentDepartment ?? '',
            reportsTo: String(profile.reportsTo ?? ''),
            departmentLevel: String(profile.departmentLevel ?? ''),
            organizationalUnit: String(profile.organizationalUnit ?? ''),
            departmentHead: d.headName ?? '',
            assistantManager: String(profile.assistantManager ?? d.assistantManager ?? ''),
            actingHead: String(profile.actingHead ?? ''),
            departmentSecretary: String(profile.departmentSecretary ?? ''),
            officialEmail: d.officialEmail ?? String(profile.officialEmail ?? ''),
            phoneNumber: d.phoneNumber ?? String(profile.phoneNumber ?? ''),
            extension: String(profile.extension ?? ''),
            whatsappNumber: String(profile.whatsappNumber ?? ''),
            website: String(profile.website ?? ''),
            branch: d.branch ?? '',
            building: String(profile.building ?? ''),
            floor: String(profile.floor ?? ''),
            officeNumber: String(profile.officeNumber ?? ''),
            physicalAddress: String(profile.physicalAddress ?? ''),
            costCenter: d.costCenter ?? String(profile.costCenter ?? ''),
            budgetCode: String(profile.budgetCode ?? ''),
            annualBudget: d.budget ? String(d.budget) : '',
            currency: String(profile.currency ?? 'RWF'),
            expenseCategory: String(profile.expenseCategory ?? ''),
            maxEmployees: profile.maxEmployees ? String(profile.maxEmployees) : '',
            minEmployees: profile.minEmployees ? String(profile.minEmployees) : '',
            workingSchedule: String(profile.workingSchedule ?? ''),
            workingDays: Array.isArray(profile.workingDays) ? (profile.workingDays as string[]) : [],
            startTime: String(profile.startTime ?? ''),
            endTime: String(profile.endTime ?? ''),
            accessModules: Array.isArray(profile.accessModules) ? (profile.accessModules as string[]) : d.accessModules ?? [],
            tags: d.tags ?? [],
            description: d.description ?? String(profile.description ?? ''),
            status: d.status === 'INACTIVE' ? 'Inactive' : d.status === 'ARCHIVED' ? 'Archived' : 'Active',
            effectiveStartDate: String(profile.effectiveStartDate ?? ''),
            effectiveEndDate: String(profile.effectiveEndDate ?? ''),
            visibility: String(profile.visibility ?? 'EVERYONE'),
          }));
        })
        .catch(() => undefined);
    }
  }, [departmentId]);

  useEffect(() => {
    if (!form.autoGenerateCode) return;
    const letter = form.name.trim()[0]?.toUpperCase() ?? '';
    if (!letter) {
      setForm((f) => ({ ...f, code: '' }));
      return;
    }
    if (letter !== codeLetterRef.current) {
      codeLetterRef.current = letter;
      codeSuffixRef.current = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    }
    setForm((f) => ({ ...f, code: buildAutoDepartmentCode(form.name, codeSuffixRef.current) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.autoGenerateCode]);

  useEffect(() => {
    if (!form.name.trim()) {
      setForm((f) => ({ ...f, tags: [] }));
      return;
    }
    setForm((f) => ({
      ...f,
      tags: generateTagsFromDepartmentName(f.name, f.departmentType, f.departmentCategory),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.departmentType, form.departmentCategory]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleWorkingDay(day: string) {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day) ? f.workingDays.filter((d) => d !== day) : [...f.workingDays, day],
    }));
  }

  function addAttachments(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  const employeeOptions = useMemo(
    () =>
      employees.map((e) =>
        e.position ? `${e.name} — ${e.position}` : e.name
      ),
    [employees]
  );

  const departmentTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          departments
            .map((d) => d.departmentType)
            .filter((value): value is string => Boolean(value))
        )
      ),
    [departments]
  );

  const departmentNames = useMemo(
    () => [
      'None (Top-Level)',
      ...departments
        .filter((d) => d.id !== departmentId)
        .map((d) => d.name)
        .filter((name, index, arr) => arr.indexOf(name) === index),
    ],
    [departments, departmentId]
  );

  async function submit() {
    if (!form.name.trim()) {
      toast.warning('Department name is required.', 'Required field');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        departmentType: form.departmentType || null,
        departmentCategory: form.departmentCategory || null,
        parentDepartment: form.parentDepartment || null,
        reportsTo: form.reportsTo || null,
        departmentLevel: form.departmentLevel || null,
        organizationalUnit: form.organizationalUnit || null,
        departmentHead: form.departmentHead || null,
        assistantManager: form.assistantManager || null,
        actingHead: form.actingHead || null,
        departmentSecretary: form.departmentSecretary || null,
        officialEmail: form.officialEmail || null,
        phoneNumber: form.phoneNumber || null,
        extension: form.extension || null,
        whatsappNumber: form.whatsappNumber || null,
        website: form.website || null,
        branch: form.branch || null,
        building: form.building || null,
        floor: form.floor || null,
        officeNumber: form.officeNumber || null,
        physicalAddress: form.physicalAddress || null,
        costCenter: null,
        budgetCode: null,
        annualBudget: null,
        expenseCategory: null,
        maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : null,
        minEmployees: form.minEmployees ? Number(form.minEmployees) : null,
        workingSchedule: form.workingSchedule || null,
        workingDays: form.workingDays,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        accessModules: [],
        tags: form.tags,
        description: form.description || null,
        status: form.status,
        effectiveStartDate: form.effectiveStartDate || null,
        effectiveEndDate: form.effectiveEndDate || null,
        visibility: form.visibility,
        notifications: {
          notifyDepartmentHead: form.notifyDepartmentHead,
          notifyHR: form.notifyHR,
          notifyEmployees: form.notifyEmployees,
          sendEmail: form.sendEmail,
          sendSMS: form.sendSMS,
        },
      };

      if (departmentId) {
        const { data } = await hrApi.updateDepartment(departmentId, payload);
        toast.success(`"${form.name.trim()}" was updated successfully.`, 'Department updated');
        if (variant === 'modal') {
          onSuccess?.(data.data);
          onClose?.();
        } else {
          router.push('/departments');
        }
      } else {
        const { data } = await hrApi.createDepartment(payload);
        toast.success(`"${form.name.trim()}" has been created.`, 'Department created');
        if (variant === 'modal') {
          onSuccess?.(data.data);
          onClose?.();
        } else {
          router.push('/departments');
        }
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save department.'), 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const wizard = (
    <HrStepWizard
      steps={STEPS}
      currentStep={step}
      onStepClick={setStep}
      onCancel={() => (variant === 'modal' ? onClose?.() : router.push('/departments'))}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => setStep((s) => s + 1)}
      onSubmit={submit}
      isLastStep={step === 6}
      saving={saving}
      submitLabel={departmentId ? 'Save Changes' : 'Create Department'}
    >
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Department Name" required className="sm:col-span-2">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Human Resources"
                />
              </FormField>

              <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <FormField label="Department Code">
                  <input
                    className="input font-mono uppercase tracking-wider"
                    value={form.code}
                    disabled={form.autoGenerateCode}
                    onChange={(e) => update('code', e.target.value.toUpperCase())}
                    placeholder="e.g. H4521"
                  />
                </FormField>
                <label className="flex items-center gap-2 pb-2.5 text-xs font-semibold text-[#000435]">
                  <input
                    type="checkbox"
                    checked={form.autoGenerateCode}
                    onChange={(e) => update('autoGenerateCode', e.target.checked)}
                    className="h-4 w-4 accent-[#FCB038]"
                  />
                  Auto-generate (1 letter + 4 digits)
                </label>
              </div>

              <Combobox
                label="Department Type"
                required
                value={form.departmentType}
                onChange={(v) => update('departmentType', v)}
                options={departmentTypeOptions}
                placeholder="Type or select from existing departments"
              />
              <Combobox
                label="Department Category"
                value={form.departmentCategory}
                onChange={(v) => update('departmentCategory', v)}
                options={categoryOptions}
                placeholder="Type or select category (optional)"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Layers size={14} /> Organizational Structure
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Combobox
                  label="Parent Department"
                  value={form.parentDepartment}
                  onChange={(v) => update('parentDepartment', v)}
                  options={departmentNames}
                  placeholder="None (Top-Level)"
                  hint="Optional — leave empty for a top-level department."
                />
                <Combobox
                  label="Reports To"
                  value={form.reportsTo}
                  onChange={(v) => update('reportsTo', v)}
                  options={employeeOptions}
                  placeholder="Search or type manually (optional)"
                  hint="Optional — search an employee or enter a name/position."
                />
                <SelectField
                  label="Department Level"
                  value={form.departmentLevel}
                  onChange={(v) => update('departmentLevel', v)}
                  options={DEPARTMENT_LEVELS.map((l) => ({ value: l, label: l }))}
                  placeholder="Select level"
                />
                <SelectField
                  label="Organizational Unit"
                  value={form.organizationalUnit}
                  onChange={(v) => update('organizationalUnit', v)}
                  options={ORGANIZATIONAL_UNITS.map((u) => ({ value: u, label: u }))}
                  placeholder="Select unit"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Users size={14} /> Department Leadership
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Department Head">
                  <input
                    className="input"
                    value={form.departmentHead}
                    onChange={(e) => update('departmentHead', e.target.value)}
                    placeholder="Enter department head name"
                  />
                </FormField>
                <Combobox
                  label="Assistant Manager"
                  value={form.assistantManager}
                  onChange={(v) => update('assistantManager', v)}
                  options={employeeOptions}
                  placeholder="Search or type manually (optional)"
                />
                <Combobox
                  label="Acting Head"
                  value={form.actingHead}
                  onChange={(v) => update('actingHead', v)}
                  options={employeeOptions}
                  placeholder="Search or type manually (optional)"
                />
                <Combobox
                  label="Department Secretary"
                  value={form.departmentSecretary}
                  onChange={(v) => update('departmentSecretary', v)}
                  options={employeeOptions}
                  placeholder="Search or type manually (optional)"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Phone size={14} /> Contact Information
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Official Email">
                  <input className="input" type="email" value={form.officialEmail} onChange={(e) => update('officialEmail', e.target.value)} placeholder="hr@company.com" />
                </FormField>
                <FormField label="Phone Number">
                  <input className="input" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} placeholder="+250…" />
                </FormField>
                <FormField label="Extension">
                  <input className="input" value={form.extension} onChange={(e) => update('extension', e.target.value)} placeholder="203" />
                </FormField>
                <FormField label="WhatsApp Number">
                  <input className="input" value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} placeholder="Optional" />
                </FormField>
                <FormField label="Website" className="sm:col-span-2">
                  <input className="input" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="Optional" />
                </FormField>
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <MapPin size={14} /> Location
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Branch">
                  <input className="input" value={form.branch} onChange={(e) => update('branch', e.target.value)} placeholder="e.g. Kigali HQ (optional)" />
                </FormField>
                <FormField label="Building">
                  <input className="input" value={form.building} onChange={(e) => update('building', e.target.value)} placeholder="e.g. Block A (optional)" />
                </FormField>
                <FormField label="Floor">
                  <input className="input" value={form.floor} onChange={(e) => update('floor', e.target.value)} placeholder="e.g. Second Floor (optional)" />
                </FormField>
                <FormField label="Office Number">
                  <input className="input" value={form.officeNumber} onChange={(e) => update('officeNumber', e.target.value)} placeholder="e.g. 204" />
                </FormField>
                <FormField label="Physical Address" className="sm:col-span-2">
                  <textarea className="input min-h-[90px]" value={form.physicalAddress} onChange={(e) => update('physicalAddress', e.target.value)} placeholder="Street, sector, district…" />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Calendar size={14} /> Operational Settings
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Working Schedule"
                  value={form.workingSchedule}
                  onChange={(v) => update('workingSchedule', v)}
                  options={WORKING_SCHEDULES.map((s) => ({ value: s, label: s }))}
                  placeholder="Select schedule"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Start Time">
                    <input type="time" className="input" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} />
                  </FormField>
                  <FormField label="End Time">
                    <input type="time" className="input" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Working Days" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {WORKING_DAYS.map((day) => {
                      const active = form.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWorkingDay(day)}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                            active
                              ? 'border-[#FCB038] bg-[#FCB038]/10 text-[#000435]'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-[#FCB038]/40'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </FormField>
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Grid3x3 size={14} /> Capacity
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Minimum Employees">
                  <input type="number" className="input" value={form.minEmployees} onChange={(e) => update('minEmployees', e.target.value)} placeholder="e.g. 5 (optional)" />
                </FormField>
                <FormField label="Maximum Employees">
                  <input type="number" className="input" value={form.maxEmployees} onChange={(e) => update('maxEmployees', e.target.value)} placeholder="e.g. 40 (optional)" />
                </FormField>
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 sm:col-span-2">
                  Current employee count is calculated automatically once staff are assigned to this department.
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <FormField label="Tags">
              <AutoTagsPreview tags={form.tags} />
              <p className="mt-2 text-[11px] text-slate-400">Tags are generated automatically from the department name, type and category.</p>
            </FormField>

            <FormField label="Description">
              <textarea
                className="input min-h-[160px]"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Department objectives, responsibilities, mission, and any notes worth recording."
              />
            </FormField>

            <FormField label="Attachments">
              <AttachmentList
                files={attachments}
                onAdd={addAttachments}
                onRemove={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
              />
            </FormField>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Status" value={form.status} onChange={(v) => update('status', v)} options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Effective Start Date">
                  <input type="date" className="input" value={form.effectiveStartDate} onChange={(e) => update('effectiveStartDate', e.target.value)} />
                </FormField>
                <FormField label="Effective End Date">
                  <input type="date" className="input" value={form.effectiveEndDate} onChange={(e) => update('effectiveEndDate', e.target.value)} />
                </FormField>
              </div>
            </div>

            <FormField label="Visibility">
              <RadioGroup
                name="visibility"
                value={form.visibility}
                onChange={(v) => update('visibility', v)}
                options={VISIBILITY_OPTIONS}
              />
            </FormField>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Bell size={14} /> Notifications
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {([
                  ['notifyDepartmentHead', 'Notify Department Head'],
                  ['notifyHR', 'Notify HR'],
                  ['notifyEmployees', 'Notify Employees'],
                  ['sendEmail', 'Send Email'],
                  ['sendSMS', 'Send SMS'],
                ] as const).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-sm font-semibold text-[#000435]"
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => update(key, e.target.checked)}
                      className="h-4.5 w-4.5 accent-[#FCB038]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-[#FCB038]/20 bg-[#000435] p-6 text-white shadow-[0_16px_32px_-12px_rgba(0,4,53,0.45)] lg:w-64 lg:shrink-0">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FCB038]/15 text-[#FCB038]">
                  <Building2 size={28} />
                </span>
                <h4 className="mt-4 text-center text-base font-bold leading-tight">{form.name || 'Untitled Department'}</h4>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#FCB038]">
                  {form.code || 'No code'}
                </p>
                <span className="mt-4 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                  {departmentId ? 'Updating record' : 'New record'}
                </span>
              </div>

              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <SummarySection
                  icon={<Info size={14} />}
                  title="Basic Information"
                  rows={[
                    { label: 'Department Type', value: form.departmentType || '—' },
                    { label: 'Category', value: form.departmentCategory || '—' },
                  ]}
                />
                <SummarySection
                  icon={<Layers size={14} />}
                  title="Structure & Leadership"
                  rows={[
                    { label: 'Parent Department', value: form.parentDepartment || 'None (Top-Level)' },
                    { label: 'Reports To', value: form.reportsTo || '—' },
                    { label: 'Level', value: form.departmentLevel || '—' },
                    { label: 'Department Head', value: form.departmentHead || '—' },
                  ]}
                />
                <SummarySection
                  icon={<Phone size={14} />}
                  title="Contact & Location"
                  rows={[
                    { label: 'Email', value: form.officialEmail || '—' },
                    { label: 'Phone', value: form.phoneNumber || '—' },
                    { label: 'Branch', value: form.branch || '—' },
                    { label: 'Office', value: form.officeNumber || '—' },
                  ]}
                />
                <SummarySection
                  icon={<Calendar size={14} />}
                  title="Operations"
                  rows={[
                    { label: 'Schedule', value: form.workingSchedule || '—' },
                    { label: 'Working Days', value: form.workingDays.length ? form.workingDays.map((d) => d.slice(0, 3)).join(', ') : '—' },
                    { label: 'Capacity', value: `${form.minEmployees || '—'} – ${form.maxEmployees || '—'}` },
                  ]}
                />
                <SummarySection
                  icon={<TagIcon size={14} />}
                  title="Tags & Documents"
                  rows={[
                    { label: 'Tags', value: form.tags.length ? form.tags.join(', ') : '—' },
                    { label: 'Attachments', value: attachments.length ? `${attachments.length} file(s)` : 'None' },
                  ]}
                />
                <SummarySection
                  icon={<EyeIcon size={14} />}
                  title="Settings"
                  rows={[
                    { label: 'Status', value: form.status },
                    { label: 'Visibility', value: VISIBILITY_OPTIONS.find((v) => v.value === form.visibility)?.label || '—' },
                    { label: 'Effective From', value: form.effectiveStartDate || '—' },
                  ]}
                />
                <SummarySection
                  icon={<Link2 size={14} />}
                  title="Notifications"
                  rows={[
                    {
                      label: 'Will notify',
                      value: [
                        form.notifyDepartmentHead && 'Department Head',
                        form.notifyHR && 'HR',
                        form.notifyEmployees && 'Employees',
                      ].filter(Boolean).join(', ') || 'No one',
                    },
                    {
                      label: 'Channels',
                      value: [form.sendEmail && 'Email', form.sendSMS && 'SMS'].filter(Boolean).join(', ') || 'None',
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
    return <div className="max-h-[78vh] overflow-y-auto">{wizard}</div>;
  }

  return <HrPageLayout>{wizard}</HrPageLayout>;
}
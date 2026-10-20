'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Copy,
  IdCard,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Upload,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  type CreateOrgUserPayload,
  type DataScope,
  type LicensedModule,
  type ModuleAccessLevel,
  type OrgDepartment,
  type OrgUser,
  orgAdminApi,
} from '@/lib/org-admin-api';
import { prepareProfilePhoto } from '@/lib/profile-photo';
import { resolveCardAssetUrl } from '@/lib/smart-card-renderer';
import { useToast } from '@/shared/notifications';
import { StaffPositionSelect } from '@/components/staff-position-select';

const STEPS = [
  { id: 'basic', title: 'Basic info', description: 'Identity details for the new account.' },
  { id: 'placement', title: 'Placement', description: 'Branch, department, and reporting line.' },
  { id: 'modules', title: 'Modules & roles', description: 'Assign licensed modules and set Head or User.' },
  { id: 'scope', title: 'Data scope', description: 'Control how far each assignment can see records.' },
  { id: 'review', title: 'Review & activate', description: 'Confirm details and send login credentials.' },
] as const;

type AssignmentDraft = {
  slug: string;
  accessLevel: ModuleAccessLevel;
  dataScope: DataScope;
};

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeId: '',
  departmentId: '',
  branch: '',
  position: '',
  supervisorId: '',
  password: '',
  sendCredentialsEmail: true,
  requirePasswordChange: true,
  photoName: '',
  avatarUrl: null as string | null,
};

interface AddUserWizardProps {
  modules: LicensedModule[];
  users: OrgUser[];
  departmentsVersion?: number;
  onCancel: () => void;
  onCreated: (result: {
    email: string;
    tempPassword?: string;
    credentialsSent?: boolean;
  }) => void;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-navy">
      {children}
      {required ? <span className="ml-0.5 text-primary">*</span> : null}
    </label>
  );
}

function IconField({
  id,
  label,
  required,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        />
      </div>
    </div>
  );
}

export function AddUserWizard({
  modules,
  users,
  departmentsVersion = 0,
  onCancel,
  onCreated,
}: AddUserWizardProps) {
  const toast = useToast();
  const photoRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password?: string;
    sent?: boolean;
  } | null>(null);

  const supervisors = useMemo(
    () =>
      users.filter(
        (u) =>
          u.status === 'ACTIVE' &&
          (u.roles.includes('organization_admin') ||
            u.modules.some((m) => m.accessLevel === 'HEAD'))
      ),
    [users]
  );

  useEffect(() => {
    void orgAdminApi.listDepartments().then(({ data }) => setDepartments(data.data));
  }, [departmentsVersion]);

  function updateField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotoPick(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const prepared = await prepareProfilePhoto(file, { maxSize: 640, quality: 0.9 });
      updateField('avatarUrl', prepared.dataUrl);
      updateField('photoName', prepared.originalName);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Could not process photo',
        'Photo upload',
      );
    } finally {
      setPhotoBusy(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  }

  const photoPreview = useMemo(
    () => (form.avatarUrl ? resolveCardAssetUrl(form.avatarUrl, 'iam') : ''),
    [form.avatarUrl],
  );

  function toggleModule(slug: string, checked: boolean) {
    setAssignments((prev) => {
      if (!checked) return prev.filter((a) => a.slug !== slug);
      if (prev.some((a) => a.slug === slug)) return prev;
      return [...prev, { slug, accessLevel: 'USER', dataScope: 'SELF' }];
    });
  }

  function patchAssignment(slug: string, patch: Partial<AssignmentDraft>) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.slug !== slug) return a;
        const next = { ...a, ...patch };
        if (patch.accessLevel === 'HEAD' && !patch.dataScope) next.dataScope = 'ORGANIZATION';
        if (patch.accessLevel === 'USER' && !patch.dataScope) next.dataScope = 'SELF';
        return next;
      })
    );
  }

  const stepValid =
    step === 0
      ? Boolean(
          form.firstName.trim() &&
            form.lastName.trim() &&
            form.email.trim() &&
            form.phone.trim()
        )
      : step === 2
        ? assignments.length > 0 || modules.length === 0
        : true;

  async function handleFinish() {
    setSubmitting(true);
    try {
      const selectedDepartment = departments.find((d) => d.id === form.departmentId);
      const payload: CreateOrgUserPayload = {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        employeeId: form.employeeId.trim() || undefined,
        department: selectedDepartment?.name ?? undefined,
        branch: form.branch.trim() || undefined,
        position: form.position.trim() || undefined,
        supervisorId: form.supervisorId || undefined,
        password: form.password.trim() || undefined,
        avatarUrl: form.avatarUrl ?? undefined,
        moduleAssignments: assignments,
        requirePasswordChange: form.requirePasswordChange,
        sendCredentialsEmail: form.sendCredentialsEmail,
        status: 'ACTIVE',
      };
      const { data } = await orgAdminApi.createUser(payload);
      setCreatedCredentials({
        email: data.data.email,
        password: data.data.tempPassword,
        sent: data.data.credentialsSent,
      });
      onCreated({
        email: data.data.email,
        tempPassword: data.data.tempPassword,
        credentialsSent: data.data.credentialsSent,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create user';
      toast.error(message, 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!stepValid) {
      toast.warning('Please complete the required fields before continuing.', 'Almost there');
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void handleFinish();
  }

  if (createdCredentials) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="space-y-5 p-5 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h3 className="font-montserrat text-xl font-semibold text-navy">User activated</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {createdCredentials.sent
                    ? `Login credentials were emailed to ${createdCredentials.email}.`
                    : `Share these credentials with ${createdCredentials.email} securely.`}
                </p>
              </div>
            </div>
            {createdCredentials.password ? (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Temporary password
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <code className="text-base font-semibold text-navy">
                    {createdCredentials.password}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(createdCredentials.password!);
                      toast.success('Password copied', 'Copied');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white"
              >
                Back to users
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <button
        type="button"
        onClick={onCancel}
        className="group inline-flex items-start gap-2 text-left"
      >
        <ArrowLeft className="mt-0.5 size-4 text-navy transition group-hover:-translate-x-0.5" />
        <span>
          <span className="block text-sm font-semibold text-navy">Back to users</span>
          <span className="block text-xs text-slate-500">Return to users list.</span>
        </span>
      </button>

      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-navy sm:h-14 sm:w-14">
          <UserPlus className="size-6 sm:size-7" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h1 className="font-montserrat text-xl font-bold text-navy sm:text-2xl">Add new user</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Create a new user account and set up access
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-[520px] items-center gap-0 sm:min-w-0">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="flex min-w-0 flex-1 items-center">
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && setStep(i)}
                  className="flex min-w-0 flex-col items-center gap-1.5 disabled:cursor-default"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 sm:text-sm ${
                      done
                        ? 'bg-primary text-navy'
                        : active
                          ? 'bg-primary text-navy shadow-md shadow-primary/25'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? <Check className="size-3.5 sm:size-4" /> : i + 1}
                  </span>
                  <span
                    className={`max-w-[72px] truncate text-center text-[10px] font-medium sm:max-w-none sm:text-[11px] ${
                      active || done ? 'text-primary' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
                {i < STEPS.length - 1 ? (
                  <div
                    className={`mx-1 mb-5 h-0.5 min-w-[12px] flex-1 rounded-full sm:mx-2 ${
                      i < step ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form card */}
      <div className="overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
          <div>
            <h2 className="text-base font-semibold text-navy sm:text-lg">
              {step === 0 ? 'Basic information' : current.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{current.description}</p>
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <IconField
                  id="firstName"
                  label="First name"
                  required
                  icon={<User className="size-4" />}
                  value={form.firstName}
                  onChange={(v) => updateField('firstName', v)}
                  placeholder="Enter first name"
                />
                <IconField
                  id="lastName"
                  label="Last name"
                  required
                  icon={<User className="size-4" />}
                  value={form.lastName}
                  onChange={(v) => updateField('lastName', v)}
                  placeholder="Enter last name"
                />
                <IconField
                  id="email"
                  label="Email"
                  required
                  type="email"
                  icon={<Mail className="size-4" />}
                  value={form.email}
                  onChange={(v) => updateField('email', v)}
                  placeholder="name@school.com"
                />
                <IconField
                  id="phone"
                  label="Phone"
                  required
                  icon={<Phone className="size-4" />}
                  value={form.phone}
                  onChange={(v) => updateField('phone', v)}
                  placeholder="07XXXXXXXX"
                />
                <IconField
                  id="employeeId"
                  label="Staff ID"
                  icon={<IdCard className="size-4" />}
                  value={form.employeeId}
                  onChange={(v) => updateField('employeeId', v)}
                  placeholder="Auto: role + district + school + no. (e.g. TR 04 001 001)"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-primary/[0.07] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex items-start gap-3">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                      <Upload className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">Profile photo</p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {form.photoName
                        ? `Selected: ${form.photoName}`
                        : 'Optional. Automatically cropped for ID cards on upload.'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handlePhotoPick(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => photoRef.current?.click()}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy transition hover:border-primary/40 disabled:opacity-60"
                  >
                    <Upload className="size-3.5" />
                    {photoBusy ? 'Processing…' : form.avatarUrl ? 'Replace photo' : 'Upload photo'}
                  </button>
                  {form.avatarUrl ? (
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:text-red-600"
                      onClick={() => {
                        updateField('avatarUrl', null);
                        updateField('photoName', '');
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <IconField
                id="branch"
                label="Branch"
                icon={<MapPin className="size-4" />}
                value={form.branch}
                onChange={(v) => updateField('branch', v)}
                placeholder="Main campus"
              />
              <div className="min-w-0">
                <FieldLabel htmlFor="department">Department</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Building2 className="size-4" />
                  </span>
                  <select
                    id="department"
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-navy outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    value={form.departmentId}
                    onChange={(e) => updateField('departmentId', e.target.value)}
                  >
                    <option value="">
                      {departments.length
                        ? 'Select department'
                        : 'No departments — add from Manage Departments'}
                    </option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <StaffPositionSelect
                value={form.position}
                onChange={(v) => updateField('position', v)}
                required
              />
              <div className="min-w-0">
                <FieldLabel htmlFor="supervisor">Supervisor</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Users className="size-4" />
                  </span>
                  <select
                    id="supervisor"
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-navy outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    value={form.supervisorId}
                    onChange={(e) => updateField('supervisorId', e.target.value)}
                  >
                    <option value="">No supervisor</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              {modules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No licensed modules yet. Ask a platform admin to provision modules for this
                  organization.
                </p>
              ) : (
                modules.map((mod) => {
                  const assigned = assignments.find((a) => a.slug === mod.slug);
                  return (
                    <div
                      key={mod.slug}
                      className={`rounded-xl border p-3.5 transition sm:p-4 ${
                        assigned
                          ? 'border-primary/30 bg-primary/[0.04]'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <label className="flex cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={Boolean(assigned)}
                            onCheckedChange={(checked) =>
                              toggleModule(mod.slug, Boolean(checked))
                            }
                          />
                          <span>
                            <span className="block text-sm font-semibold text-navy">{mod.name}</span>
                            <span className="text-xs text-slate-500">{mod.slug}</span>
                          </span>
                        </label>
                        {assigned ? (
                          <div className="flex flex-wrap gap-2 pl-7 sm:pl-0">
                            <button
                              type="button"
                              onClick={() => patchAssignment(mod.slug, { accessLevel: 'USER' })}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                assigned.accessLevel === 'USER'
                                  ? 'bg-navy text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              Module User
                            </button>
                            <button
                              type="button"
                              onClick={() => patchAssignment(mod.slug, { accessLevel: 'HEAD' })}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                assigned.accessLevel === 'HEAD'
                                  ? 'bg-primary text-navy'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <Shield className="size-3.5" />
                              Head of Module
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {assigned?.accessLevel === 'HEAD' ? (
                        <p className="mt-3 pl-7 text-xs text-slate-500 sm:pl-0">
                          Head of Module can see work from every user assigned to{' '}
                          <strong className="text-navy">{mod.name}</strong>.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Assign at least one module in the previous step.
                </p>
              ) : (
                assignments.map((a) => {
                  const mod = modules.find((m) => m.slug === a.slug);
                  return (
                    <div
                      key={a.slug}
                      className="grid gap-3 rounded-xl border border-slate-200 p-3.5 sm:grid-cols-[1fr_200px] sm:items-center sm:p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-navy">{mod?.name ?? a.slug}</p>
                        <p className="text-xs text-slate-500">
                          Access: {a.accessLevel === 'HEAD' ? 'Head of Module' : 'Module User'}
                        </p>
                      </div>
                      <select
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                        value={a.dataScope}
                        onChange={(e) =>
                          patchAssignment(a.slug, { dataScope: e.target.value as DataScope })
                        }
                      >
                        <option value="SELF">Own records</option>
                        <option value="DEPARTMENT">Department</option>
                        <option value="BRANCH">Branch</option>
                        <option value="ORGANIZATION">Entire organization</option>
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-navy">
                  {form.firstName} {form.lastName}
                </p>
                <p className="mt-0.5 text-slate-500">
                  {form.email}
                  {form.phone ? ` · ${form.phone}` : ''}
                </p>
                <p className="mt-2 text-slate-500">
                  {[
                    form.position,
                    departments.find((d) => d.id === form.departmentId)?.name,
                    form.branch,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No placement details'}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Modules
                </p>
                <ul className="mt-1 space-y-1 text-slate-600">
                  {assignments.map((a) => (
                    <li key={a.slug}>
                      {modules.find((m) => m.slug === a.slug)?.name ?? a.slug} —{' '}
                      {a.accessLevel === 'HEAD' ? 'Head' : 'User'} ({a.dataScope})
                    </li>
                  ))}
                  {assignments.length === 0 ? <li>No modules assigned</li> : null}
                </ul>
              </div>

              <IconField
                id="password"
                label="Temporary password"
                icon={<Lock className="size-4" />}
                value={form.password}
                onChange={(v) => updateField('password', v)}
                placeholder="Leave blank to auto-generate (min 12 chars if set)"
              />

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-navy sm:items-center">
                <Checkbox
                  checked={form.sendCredentialsEmail}
                  onCheckedChange={(v) => updateField('sendCredentialsEmail', Boolean(v))}
                />
                Email login credentials to the user now
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-navy sm:items-center">
                <Checkbox
                  checked={form.requirePasswordChange}
                  onCheckedChange={(v) => updateField('requirePasswordChange', Boolean(v))}
                />
                Require password change on first login
              </label>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-navy transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep((s) => s - 1)}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy transition hover:bg-slate-50 sm:flex-none sm:px-5"
              >
                Previous
              </button>
            ) : null}
            <button
              type="button"
              disabled={submitting || !stepValid}
              onClick={goNext}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-50 sm:flex-none"
            >
              {submitting ? (
                'Creating…'
              ) : isLast ? (
                'Create & send credentials'
              ) : (
                <>
                  Next Step
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { StaffPositionSelect } from '@/components/staff-position-select';
import {
  type DataScope,
  type LicensedModule,
  type ModuleAccessLevel,
  type OrgDepartment,
  type OrgUser,
  type UpdateOrgUserPayload,
  orgAdminApi,
} from '@/lib/org-admin-api';
import { realignEmployeeIdForPosition } from '@/lib/employee-id';
import { prepareProfilePhoto } from '@/lib/profile-photo';
import { resolveCardAssetUrl } from '@/lib/smart-card-renderer';

const STEPS = [
  { id: 'basic', title: 'Basic info', description: 'Name, contact, photo, and employee ID.' },
  { id: 'placement', title: 'Placement', description: 'Branch, department, position, and supervisor.' },
  { id: 'modules', title: 'Modules & roles', description: 'Assign licensed modules and set Head or User.' },
  { id: 'scope', title: 'Data scope', description: 'Control how far each assignment can see records.' },
  { id: 'review', title: 'Review & save', description: 'Confirm changes before updating the account.' },
] as const;

type AssignmentDraft = {
  slug: string;
  accessLevel: ModuleAccessLevel;
  dataScope: DataScope;
};

interface EditUserModalProps {
  user: OrgUser | null;
  users: OrgUser[];
  modules: LicensedModule[];
  departmentsVersion?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-navy">
      {children}
      {required ? <span className="ml-0.5 text-primary">*</span> : null}
    </label>
  );
}

export function EditUserModal({
  user,
  users,
  modules,
  departmentsVersion = 0,
  open,
  onOpenChange,
  onSaved,
  onError,
}: EditUserModalProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    employeeId: '',
    branch: '',
    position: '',
    supervisorId: '',
  });
  const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [hrPhotoUrl, setHrPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const isOrgAdmin = Boolean(user?.roles.includes('organization_admin'));
  const memberRoleSlug = user?.roles.find((r) => r !== 'organization_admin') ?? user?.roles[0];

  const supervisors = useMemo(
    () =>
      users.filter(
        (u) =>
          u.id !== user?.id &&
          u.status === 'ACTIVE' &&
          (u.roles.includes('organization_admin') || u.modules.some((m) => m.accessLevel === 'HEAD'))
      ),
    [users, user?.id]
  );

  useEffect(() => {
    if (!open) return;
    void orgAdminApi.listDepartments().then(({ data }) => setDepartments(data.data));
  }, [open, departmentsVersion]);

  useEffect(() => {
    if (!user || !open) return;
    setStep(0);
    setForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      employeeId: user.employeeId ?? '',
      branch: user.branch ?? '',
      position: user.position ?? '',
      supervisorId: user.supervisor?.id ?? '',
    });
    setAssignments(
      user.modules.map((m) => ({
        slug: m.slug,
        accessLevel: m.accessLevel,
        dataScope: m.dataScope,
      }))
    );
    setAvatarPreview(user.avatarUrl ?? null);
    setHrPhotoUrl(null);
    const match = departments.find((d) => d.name === user.department);
    setDepartmentId(match?.id ?? '');

    void orgAdminApi.getUserPhotoSources(user.id).then(({ data }) => {
      setHrPhotoUrl(data.data.hrPhotoUrl);
    }).catch(() => setHrPhotoUrl(null));
  }, [user, open, departments]);

  const displayAvatar = useMemo(() => {
    if (!avatarPreview) return null;
    return resolveCardAssetUrl(avatarPreview, 'iam');
  }, [avatarPreview]);

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

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const stepValid =
    step === 0
      ? Boolean(form.firstName.trim() && form.lastName.trim() && emailValid)
      : step === 2 && !isOrgAdmin
        ? assignments.length > 0 || modules.length === 0
        : true;

  async function handlePhotoPick(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const prepared = await prepareProfilePhoto(file, { maxSize: 640, quality: 0.9 });
      setAvatarPreview(prepared.dataUrl);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Could not process photo');
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!user) return;
    const selectedDepartment = departments.find((d) => d.id === departmentId);
    const payload: UpdateOrgUserPayload = {
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      employeeId: form.employeeId.trim() || undefined,
      department: selectedDepartment?.name ?? undefined,
      branch: form.branch.trim() || undefined,
      position: form.position.trim() || undefined,
      supervisorId: form.supervisorId || null,
      avatarUrl: avatarPreview,
    };

    setSaving(true);
    try {
      await orgAdminApi.updateUser(user.id, payload);
      if (!isOrgAdmin && assignments.length > 0) {
        await orgAdminApi.setUserModules(user.id, {
          moduleAssignments: assignments,
        });
      }
      onSaved(`Profile updated for ${form.firstName} ${form.lastName}.`);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update user';
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (!stepValid) {
      onError('Please complete the required fields before continuing.');
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void handleSave();
  }

  if (!open || !user) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-navy">
              <Pencil className="size-5" />
            </span>
            <div>
              <h2 className="font-montserrat text-lg font-bold text-navy sm:text-xl">Edit user</h2>
              <p className="text-sm text-slate-500">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="-mx-1 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-6">
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
                    className="flex min-w-0 flex-col items-center gap-1 disabled:cursor-default"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 ${
                        done ? 'bg-primary text-navy' : active ? 'bg-primary text-navy shadow-md' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className={`max-w-[72px] truncate text-center text-[10px] font-medium sm:text-[11px] ${active || done ? 'text-primary' : 'text-slate-400'}`}>
                      {s.title}
                    </span>
                  </button>
                  {i < STEPS.length - 1 ? (
                    <div className={`mx-1 mb-5 h-0.5 min-w-[12px] flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-slate-200'}`} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-navy sm:text-lg">{current.title}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{current.description}</p>
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" className="h-20 w-20 rounded-full border-2 border-slate-200 object-cover" />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-lg font-semibold text-primary">
                      {`${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">Profile photo</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handlePhotoPick(e.target.files?.[0])} />
                    <button type="button" disabled={photoBusy || saving} onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
                      <Upload className="size-3.5" />
                      {photoBusy ? 'Processing…' : 'Upload photo'}
                    </button>
                    {hrPhotoUrl && hrPhotoUrl !== avatarPreview ? (
                      <button type="button" onClick={() => setAvatarPreview(hrPhotoUrl)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
                        Use HR photo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail, value: form.email, key: 'email' as const, type: 'email' as const },
                  { id: 'firstName', label: 'First name', icon: User, value: form.firstName, key: 'firstName' as const },
                  { id: 'lastName', label: 'Last name', icon: User, value: form.lastName, key: 'lastName' as const },
                  { id: 'phone', label: 'Phone', icon: Phone, value: form.phone, key: 'phone' as const },
                  {
                    id: 'employeeId',
                    label: 'Employee ID',
                    icon: IdCard,
                    value: form.employeeId,
                    key: 'employeeId' as const,
                    hint: 'Role prefix updates when you change position; school number (last 8 digits) stays the same.',
                  },
                ].map(({ id, label, icon: Icon, value, key, hint, type }) => (
                  <div key={id} className={hint ? 'sm:col-span-2' : undefined}>
                    <FieldLabel htmlFor={id} required={key === 'email' || key === 'firstName' || key === 'lastName'}>{label}</FieldLabel>
                    <div className="relative">
                      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id={id}
                        type={type ?? 'text'}
                        value={value}
                        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="branch">Branch</FieldLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input id="branch" value={form.branch} onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="department">Department</FieldLabel>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-8 text-sm text-navy outline-none focus:border-primary/50">
                    <option value="">{departments.length ? 'Select department' : 'No departments — add from Manage Departments'}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <StaffPositionSelect
                  id="position"
                  value={form.position}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      position: v,
                      employeeId: p.employeeId.trim()
                        ? realignEmployeeIdForPosition(p.employeeId, v, memberRoleSlug)
                        : p.employeeId,
                    }))
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="supervisor">Supervisor</FieldLabel>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <select id="supervisor" value={form.supervisorId} onChange={(e) => setForm((p) => ({ ...p, supervisorId: e.target.value }))} className="h-11 w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-8 text-sm text-navy outline-none focus:border-primary/50">
                    <option value="">No supervisor</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            isOrgAdmin ? (
              <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-6 text-center text-sm text-navy">
                Organization administrators have access to all licensed modules automatically.
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((mod) => {
                  const assigned = assignments.find((a) => a.slug === mod.slug);
                  return (
                    <div key={mod.slug} className={`rounded-xl border p-4 ${assigned ? 'border-primary/30 bg-primary/[0.04]' : 'border-slate-200'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <label className="flex cursor-pointer items-start gap-3">
                          <Checkbox checked={Boolean(assigned)} onCheckedChange={(c) => toggleModule(mod.slug, Boolean(c))} />
                          <span>
                            <span className="block text-sm font-semibold text-navy">{mod.name}</span>
                            <span className="text-xs text-slate-500">{mod.slug}</span>
                          </span>
                        </label>
                        {assigned ? (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => patchAssignment(mod.slug, { accessLevel: 'USER' })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${assigned.accessLevel === 'USER' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500'}`}>Module User</button>
                            <button type="button" onClick={() => patchAssignment(mod.slug, { accessLevel: 'HEAD' })} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${assigned.accessLevel === 'HEAD' ? 'bg-primary text-navy' : 'bg-slate-100 text-slate-500'}`}><Shield className="size-3.5" /> Head</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}

          {step === 3 ? (
            isOrgAdmin || assignments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {isOrgAdmin ? 'Organization admin scope is organization-wide.' : 'Assign modules in the previous step.'}
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const mod = modules.find((m) => m.slug === a.slug);
                  return (
                    <div key={a.slug} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_200px] sm:items-center">
                      <div>
                        <p className="text-sm font-semibold text-navy">{mod?.name ?? a.slug}</p>
                        <p className="text-xs text-slate-500">{a.accessLevel === 'HEAD' ? 'Head of Module' : 'Module User'}</p>
                      </div>
                      <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-navy" value={a.dataScope} onChange={(e) => patchAssignment(a.slug, { dataScope: e.target.value as DataScope })}>
                        <option value="SELF">Own records</option>
                        <option value="DEPARTMENT">Department</option>
                        <option value="BRANCH">Branch</option>
                        <option value="ORGANIZATION">Entire organization</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}

          {step === 4 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-sm">
              <p className="text-lg font-semibold text-navy">{form.firstName} {form.lastName}</p>
              <p className="text-slate-500">{form.email}{form.phone ? ` · ${form.phone}` : ''}</p>
              <p className="mt-3 text-slate-600">
                {[form.position, departments.find((d) => d.id === departmentId)?.name, form.branch].filter(Boolean).join(' · ') || 'No placement'}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Modules</p>
              <ul className="mt-1 space-y-1 text-slate-600">
                {isOrgAdmin ? <li>All modules (Organization Admin)</li> : assignments.map((a) => (
                  <li key={a.slug}>{modules.find((m) => m.slug === a.slug)?.name ?? a.slug} — {a.accessLevel} ({a.dataScope})</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-navy hover:bg-slate-50">
            Cancel
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <button type="button" disabled={saving} onClick={() => setStep((s) => s - 1)} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-navy hover:bg-slate-50">
                Previous
              </button>
            ) : null}
            <button type="button" disabled={saving || !stepValid} onClick={goNext} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-primary disabled:opacity-50">
              {saving ? 'Saving…' : isLast ? 'Save changes' : <>Next <ArrowRight className="size-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

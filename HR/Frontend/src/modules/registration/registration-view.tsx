'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Camera,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Heart,
  KeyRound,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
  Loader2,
} from 'lucide-react';
import { EmployeeImportModal } from '@/components/employee-import-modal';
import { StaffPositionSelect } from '@/components/staff-position-select';
import { FormField, HrStepWizard, RadioGroup, SelectField } from '@/components/hr-step-wizard';
import { HrPageLayout } from '@/components/hr-page-layout';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { prepareProfilePhoto } from '@/utils/image-resize';
import { downloadTemplate } from '@/utils/hrEmployeeImportTemplate';
import type { Department } from '@/types';
import {
  BENEFITS,
  CITIZENSHIP_STATUSES,
  COUNTRIES,
  DOCUMENT_FIELDS,
  EDUCATION_LEVELS,
  EMPLOYEE_TAGS,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  ID_TYPES,
  KIN_RELATIONS,
  LANGUAGES,
  MARITAL_STATUSES,
  PAYMENT_FREQUENCIES,
  RWANDA_BANKS,
  type DocumentFieldKey,
} from './registration-constants';
import {
  FileUploadBox,
  MultiSelectChips,
  SearchableSelect,
  SectionHeading,
} from './registration-components';

const STEPS = [
  { title: 'Basic Information', description: 'Personal details and profile photo.' },
  { title: 'Contact Information', description: 'Personal email and phone numbers.' },
  { title: 'Identification & Banking', description: 'ID documents and optional banking.' },
  { title: 'Employment Information', description: 'Job details, department and contract.' },
  { title: 'Education & Qualifications', description: 'Academic background and skills.' },
  { title: 'Salary & Benefits', description: 'Compensation and benefits (optional).' },
  { title: 'Next of Kin', description: 'Emergency contacts — add one or more.' },
  { title: 'Documents & Review', description: 'Optional uploads and final review.' },
];

type NextOfKinEntry = {
  id: string;
  name: string;
  relation: string;
  relationOther: string;
  phone: string;
  altPhone: string;
  email: string;
  occupation: string;
  address: string;
  country: string;
  city: string;
};

function emptyKinEntry(): NextOfKinEntry {
  return {
    id: crypto.randomUUID(),
    name: '',
    relation: '',
    relationOther: '',
    phone: '',
    altPhone: '',
    email: '',
    occupation: '',
    address: '',
    country: '',
    city: '',
  };
}

function kinFromProfile(raw: Record<string, unknown>): NextOfKinEntry {
  const rel = resolveRelation(String(raw.relation ?? ''));
  return {
    id: crypto.randomUUID(),
    name: String(raw.name ?? ''),
    relation: rel.relation,
    relationOther: rel.relationOther,
    phone: String(raw.phone ?? ''),
    altPhone: String(raw.altPhone ?? ''),
    email: String(raw.email ?? ''),
    occupation: String(raw.occupation ?? ''),
    address: String(raw.address ?? ''),
    country: String(raw.country ?? ''),
    city: String(raw.city ?? ''),
  };
}

const INITIAL_FORM = {
  photoUrl: '',
  firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: 'MALE',
  countryOfBirth: 'Rwanda', provinceOfBirth: '', districtOfBirth: '', sectorOfBirth: '',
  residenceCountry: 'Rwanda', residenceProvince: '', residenceDistrict: '', residenceSector: '',
  residenceVillage: '',
  nationality: 'Rwanda', secondNationality: '', citizenshipStatus: 'Citizen', maritalStatus: '',
  personalEmail: '', mobilePhone: '', alternativePhone: '',
  idType: 'National ID', idNumber: '', idCountry: 'Rwanda', socialSecurity: '',
  bankName: '', bankNameOther: '', accountHolder: '', accountNumber: '',
  departmentId: '', position: '',
  employmentType: 'PERMANENT', employmentStatus: 'ACTIVE',
  hireDate: '', probationEndDate: '', contractEnd: '', ongoingContract: false,
  educationLevel: '', institution: '', graduationYear: '', certifications: '', skills: '',
  languages: [] as string[],
  basicSalary: '', netSalary: '', currency: 'RWF', paymentFrequency: 'Monthly',
  benefits: [] as string[],
  nextOfKinList: [emptyKinEntry()] as NextOfKinEntry[],
  hrNotes: '', recruitmentSource: '', employeeTags: [] as string[],
  enablePortal: false, loginEmail: '', password: '', confirmPassword: '',
  assignedRole: '', assignedPermissions: [] as string[],
};

interface Props {
  employeeId?: string;
}

function resolveRelation(relation: string) {
  if (!relation) return { relation: '', relationOther: '' };
  if (KIN_RELATIONS.includes(relation)) return { relation, relationOther: '' };
  return { relation: 'Other', relationOther: relation };
}

function resolveBankName(name: string) {
  if (!name) return { bankName: '', bankNameOther: '' };
  if (RWANDA_BANKS.includes(name)) return { bankName: name, bankNameOther: '' };
  return { bankName: 'Other', bankNameOther: name };
}

function buildResidenceAddress(form: typeof INITIAL_FORM) {
  return [
    form.residenceVillage,
    form.residenceSector,
    form.residenceDistrict,
    form.residenceProvince,
    form.residenceCountry !== 'Rwanda' ? form.residenceCountry : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function hydrateFromEmployee(e: {
  firstName: string; middleName?: string | null; lastName: string; gender: string;
  dateOfBirth: string; email?: string | null; phone: string; address?: string | null;
  nationalId?: string | null; departmentId?: string | null; position: string;
  contractType: string; status: string; hireDate: string; contractEnd?: string | null;
  ongoingContract: boolean; basicSalary?: number | null; netSalary?: number | null;
  photoUrl?: string | null; hrProfile?: Record<string, unknown>;
}): typeof INITIAL_FORM {
  const p = (e.hrProfile ?? {}) as Record<string, Record<string, unknown>>;
  const personal = p.personal ?? {};
  const contact = p.contact ?? {};
  const identification = p.identification ?? {};
  const banking = (p.banking ?? p.bank ?? {}) as Record<string, string>;
  const employment = p.employment ?? {};
  const education = p.education ?? {};
  const salary = p.salary ?? {};
  const nok = p.nextOfKin ?? {};
  const sk = p.secondaryKin ?? {};
  const sys = (p.systemAccess ?? {}) as Record<string, unknown>;
  const bank = resolveBankName(String(banking.bankName ?? ''));

  const storedKinList = Array.isArray(p.nextOfKinList)
    ? (p.nextOfKinList as Record<string, unknown>[]).map(kinFromProfile)
    : [];
  const legacyKin: NextOfKinEntry[] = [];
  if (nok && typeof nok === 'object' && String((nok as Record<string, unknown>).name ?? '').trim()) {
    legacyKin.push(kinFromProfile(nok as Record<string, unknown>));
  }
  if (sk && typeof sk === 'object' && String((sk as Record<string, unknown>).name ?? '').trim()) {
    legacyKin.push(kinFromProfile(sk as Record<string, unknown>));
  }
  const nextOfKinList =
    storedKinList.length > 0 ? storedKinList : legacyKin.length > 0 ? legacyKin : [emptyKinEntry()];

  return {
    ...INITIAL_FORM,
    photoUrl: e.photoUrl ?? '',
    firstName: e.firstName,
    middleName: e.middleName ?? '',
    lastName: e.lastName,
    dateOfBirth: e.dateOfBirth.split('T')[0],
    gender: e.gender,
    personalEmail: e.email ?? '',
    mobilePhone: e.phone,
    idNumber: e.nationalId ?? '',
    departmentId: e.departmentId ?? '',
    position: e.position,
    employmentType: e.contractType,
    employmentStatus: e.status,
    hireDate: e.hireDate.split('T')[0],
    contractEnd: e.contractEnd?.split('T')[0] ?? '',
    ongoingContract: e.ongoingContract,
    basicSalary: e.basicSalary ? String(e.basicSalary) : '',
    netSalary: e.netSalary ? String(e.netSalary) : '',
    countryOfBirth: String(personal.countryOfBirth ?? 'Rwanda'),
    provinceOfBirth: String(personal.provinceOfBirth ?? ''),
    districtOfBirth: String(personal.districtOfBirth ?? ''),
    sectorOfBirth: String(personal.sectorOfBirth ?? ''),
    residenceCountry: String(personal.residenceCountry ?? 'Rwanda'),
    residenceProvince: String(personal.residenceProvince ?? ''),
    residenceDistrict: String(personal.residenceDistrict ?? ''),
    residenceSector: String(personal.residenceSector ?? ''),
    residenceVillage: String(personal.residenceVillage ?? ''),
    nationality: String(personal.nationality ?? 'Rwanda'),
    secondNationality: String(personal.secondNationality ?? ''),
    citizenshipStatus: String(personal.citizenshipStatus ?? 'Citizen'),
    maritalStatus: String(personal.maritalStatus ?? ''),
    alternativePhone: String(contact.alternativePhone ?? ''),
    idType: String(identification.idType ?? 'National ID'),
    idCountry: String(identification.countryOfIssue ?? 'Rwanda'),
    socialSecurity: String(identification.socialSecurity ?? ''),
    bankName: bank.bankName,
    bankNameOther: bank.bankNameOther,
    accountHolder: String(banking.accountHolder ?? ''),
    accountNumber: String(banking.accountNumber ?? ''),
    probationEndDate: String(employment.probationEndDate ?? ''),
    educationLevel: String(education.educationLevel ?? ''),
    institution: String(education.institution ?? ''),
    graduationYear: String(education.graduationYear ?? ''),
    certifications: String(education.certifications ?? ''),
    skills: String(education.skills ?? ''),
    languages: Array.isArray(education.languages) ? (education.languages as string[]) : [],
    currency: String(salary.currency ?? 'RWF'),
    paymentFrequency: String(salary.paymentFrequency ?? 'Monthly'),
    benefits: Array.isArray(salary.benefits) ? (salary.benefits as string[]) : [],
    nextOfKinList,
    hrNotes: String(p.hrNotes ?? ''),
    recruitmentSource: String(p.recruitmentSource ?? ''),
    employeeTags: Array.isArray(p.employeeTags) ? (p.employeeTags as string[]) : [],
    enablePortal: Boolean(sys.enabled),
    loginEmail: String(sys.loginEmail ?? e.email ?? ''),
    assignedRole: String(sys.assignedRole ?? ''),
    assignedPermissions: Array.isArray(sys.assignedPermissions) ? (sys.assignedPermissions as string[]) : [],
  };
}

function PasswordField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label}>
      <div className="relative">
        <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type={visible ? 'text' : 'password'} className="input pl-10 pr-12" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="new-password" />
        <button type="button" onClick={() => setVisible((v) => !v)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-[#000435]">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </FormField>
  );
}

function SummarySection({ icon, title, rows }: { icon: ReactNode; title: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">{icon}<h3 className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">{title}</h3></div>
      <dl className="grid gap-3 px-4 py-4 text-xs sm:grid-cols-2">
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

function KinEntryFields({
  entry,
  index,
  required,
  onChange,
  onRemove,
  canRemove,
}: {
  entry: NextOfKinEntry;
  index: number;
  required?: boolean;
  onChange: (patch: Partial<NextOfKinEntry>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-100 bg-slate-50/40 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#000435]">
          Next of Kin {index + 1}
          {required ? ' *' : ''}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full Name" required={required}>
          <input className="input" value={entry.name} onChange={(e) => onChange({ name: e.target.value })} />
        </FormField>
        <SearchableSelect
          label="Relationship"
          required={required}
          value={entry.relation}
          onChange={(v) => onChange({ relation: v })}
          options={KIN_RELATIONS}
        />
        {entry.relation === 'Other' && (
          <FormField label="Specify Relationship" className="sm:col-span-2">
            <input
              className="input"
              value={entry.relationOther}
              onChange={(e) => onChange({ relationOther: e.target.value })}
            />
          </FormField>
        )}
        <FormField label="Phone Number" required={required}>
          <input className="input" value={entry.phone} onChange={(e) => onChange({ phone: e.target.value })} />
        </FormField>
        <FormField label="Alternative Phone">
          <input className="input" value={entry.altPhone} onChange={(e) => onChange({ altPhone: e.target.value })} />
        </FormField>
        <FormField label="Email">
          <input type="email" className="input" value={entry.email} onChange={(e) => onChange({ email: e.target.value })} />
        </FormField>
        <FormField label="Occupation">
          <input className="input" value={entry.occupation} onChange={(e) => onChange({ occupation: e.target.value })} />
        </FormField>
        <FormField label="Address" className="sm:col-span-2">
          <input className="input" value={entry.address} onChange={(e) => onChange({ address: e.target.value })} />
        </FormField>
        <SearchableSelect
          label="Country"
          value={entry.country}
          onChange={(v) => onChange({ country: v })}
          options={COUNTRIES}
        />
        <FormField label="City / District">
          <input className="input" value={entry.city} onChange={(e) => onChange({ city: e.target.value })} />
        </FormField>
      </div>
    </div>
  );
}

export function RegistrationView({ employeeId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [digitalId, setDigitalId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<DocumentFieldKey, File | null>>(
    Object.fromEntries(DOCUMENT_FIELDS.map((d) => [d.key, null])) as Record<DocumentFieldKey, File | null>
  );

  useEffect(() => {
    hrApi.departments().then(({ data }) => setDepartments(data.data)).catch(() => undefined);
    if (!employeeId) {
      setDigitalId(null);
      return;
    }
    hrApi.getEmployee(employeeId)
      .then(({ data }) => {
        setForm(hydrateFromEmployee(data.data));
        setDigitalId((data.data as { rfidUid?: string | null }).rfidUid ?? null);
      })
      .catch(() => undefined);
  }, [employeeId]);

  function update(field: string, value: string | boolean | string[] | NextOfKinEntry[]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateKinEntry(id: string, patch: Partial<NextOfKinEntry>) {
    setForm((f) => ({
      ...f,
      nextOfKinList: f.nextOfKinList.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));
  }

  function addKinEntry() {
    setForm((f) => ({ ...f, nextOfKinList: [...f.nextOfKinList, emptyKinEntry()] }));
  }

  function removeKinEntry(id: string) {
    setForm((f) => {
      const next = f.nextOfKinList.filter((entry) => entry.id !== id);
      return { ...f, nextOfKinList: next.length > 0 ? next : [emptyKinEntry()] };
    });
  }

  async function onPhotoPick(file: File | null) {
    if (!file) return;
    setPhotoLoading(true);
    try {
      const prepared = await prepareProfilePhoto(file);
      update('photoUrl', prepared.dataUrl);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not process photo.', 'Photo upload');
    } finally {
      setPhotoLoading(false);
    }
  }

  async function uploadPendingDocuments(employeeIdValue: string) {
    const { uploadEmployeeDocument } = await import('@/utils/document-upload');
    for (const entry of DOCUMENT_FIELDS) {
      const file = docs[entry.key];
      if (!file) continue;
      await uploadEmployeeDocument(employeeIdValue, entry.category, file);
    }
  }

  function buildPayload() {
    const gender = form.gender === 'PREFER_NOT_TO_SAY' ? 'OTHER' : form.gender;
    const kinRows = form.nextOfKinList
      .filter((k) => k.name.trim())
      .map((k) => ({
        name: k.name.trim(),
        relation: k.relation === 'Other' ? k.relationOther.trim() : k.relation,
        phone: k.phone.trim(),
        altPhone: k.altPhone.trim() || null,
        email: k.email.trim() || null,
        occupation: k.occupation.trim() || null,
        address: k.address.trim() || null,
        country: k.country.trim() || null,
        city: k.city.trim() || null,
      }));
    const primary = kinRows[0];
    const secondary = kinRows[1];

    return {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      gender,
      dateOfBirth: form.dateOfBirth,
      email: form.personalEmail.trim() || null,
      phone: form.mobilePhone.trim(),
      address: buildResidenceAddress(form) || null,
      nationalId: form.idNumber.trim() || null,
      photoUrl: form.photoUrl || null,
      departmentId: form.departmentId || null,
      position: form.position.trim(),
      contractType: form.employmentType,
      status: form.employmentStatus,
      hireDate: form.hireDate,
      contractEnd: form.ongoingContract ? null : form.contractEnd || null,
      ongoingContract: form.ongoingContract,
      basicSalary: form.basicSalary ? Number(form.basicSalary) : null,
      netSalary: form.netSalary ? Number(form.netSalary) : null,
      hrProfile: {
        personal: {
          countryOfBirth: form.countryOfBirth,
          provinceOfBirth: form.provinceOfBirth,
          districtOfBirth: form.districtOfBirth,
          sectorOfBirth: form.sectorOfBirth,
          residenceCountry: form.residenceCountry,
          residenceProvince: form.residenceProvince,
          residenceDistrict: form.residenceDistrict,
          residenceSector: form.residenceSector,
          residenceVillage: form.residenceVillage,
          nationality: form.nationality,
          secondNationality: form.secondNationality,
          citizenshipStatus: form.citizenshipStatus,
          maritalStatus: form.maritalStatus,
        },
        contact: {
          alternativePhone: form.alternativePhone,
        },
        identification: {
          idType: form.idType,
          countryOfIssue: form.idCountry,
          socialSecurity: form.socialSecurity,
        },
        banking: {
          bankName: form.bankName === 'Other' ? form.bankNameOther : form.bankName,
          accountHolder: form.accountHolder,
          accountNumber: form.accountNumber,
        },
        employment: {
          probationEndDate: form.probationEndDate,
        },
        education: {
          educationLevel: form.educationLevel,
          institution: form.institution,
          graduationYear: form.graduationYear,
          certifications: form.certifications,
          skills: form.skills,
          languages: form.languages,
        },
        salary: {
          currency: form.currency,
          paymentFrequency: form.paymentFrequency,
          benefits: form.benefits,
        },
        nextOfKinList: kinRows,
        nextOfKin: primary ?? {},
        secondaryKin: secondary ?? {},
        hrNotes: form.hrNotes,
        recruitmentSource: form.recruitmentSource,
        employeeTags: form.employeeTags,
        systemAccess: {
          enabled: form.enablePortal,
          loginEmail: form.loginEmail.trim() || form.personalEmail.trim() || null,
          password: form.enablePortal && form.password ? form.password : undefined,
          assignedRole: form.assignedRole || null,
          assignedPermissions: form.assignedPermissions,
        },
      },
    };
  }

  async function submit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.mobilePhone.trim()) {
      toast.warning('Please complete first name, last name, and mobile phone.', 'Required fields');
      return;
    }
    if (!form.dateOfBirth || !form.nationality || !form.idNumber.trim() || !form.hireDate || !form.residenceDistrict.trim()) {
      toast.warning('Complete required fields on Basic, Identification and Employment steps.', 'Required fields');
      return;
    }
    const primaryKin = form.nextOfKinList[0];
    if (!primaryKin?.name.trim() || !primaryKin.relation || !primaryKin.phone.trim()) {
      toast.warning('Please complete the first next of kin entry.', 'Required fields');
      return;
    }
    if (form.enablePortal && form.password && form.password !== form.confirmPassword) {
      toast.error('The passwords you entered do not match.', 'Password mismatch');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (employeeId) {
        await hrApi.updateEmployee(employeeId, payload);
        try { await uploadPendingDocuments(employeeId); } catch {
          toast.warning('Employee saved but some documents could not be uploaded.', 'Documents');
        }
        toast.success(`${form.firstName} ${form.lastName} was updated successfully.`, 'Employee updated');
        router.push(`/directory/${employeeId}`);
      } else {
        const { data } = await hrApi.createEmployee(payload);
        try { await uploadPendingDocuments(data.data.id); } catch {
          toast.warning('Employee registered but some documents could not be uploaded.', 'Documents');
        }
        toast.success(`${form.firstName} ${form.lastName} has been registered.`, 'Registration complete');
        router.push(`/directory/${data.data.id}`);
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save employee.'), 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  const deptName = departments.find((d) => d.id === form.departmentId)?.name ?? '—';
  const attachedDocs = DOCUMENT_FIELDS.filter((d) => docs[d.key]).length;

  return (
    <HrPageLayout>
      <EmployeeImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      {!employeeId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#000435]/10 bg-[#000435] p-5 text-white">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={22} className="text-[#FCB038]" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">Bulk Onboarding</h3>
              <p className="text-[11px] text-white/60">Import employees via Excel template</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => downloadTemplate('full')} className="btn-secondary text-xs">Download Template</button>
            <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#FCB038] px-4 py-2.5 text-xs font-bold text-[#000435]">
              <Upload size={14} /> Import Excel
            </button>
          </div>
        </div>
      )}

      <HrStepWizard
        steps={STEPS}
        currentStep={step}
        onStepClick={setStep}
        onCancel={() => router.push('/directory')}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
        onSubmit={submit}
        isLastStep={step === 7}
        saving={saving}
        submitLabel={employeeId ? 'Save Changes' : 'Submit Registration'}
      >
        {step === 0 && (
          <div className="space-y-8">
            <SectionHeading icon={<Camera size={14} />} title="Profile Photo" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="group relative flex h-36 w-36 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-[#FCB038]/30 bg-[#000435] text-[#FCB038] shadow-md ring-4 ring-[#000435]/5">
                {photoLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt="Profile"
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <Camera size={36} />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={photoLoading}
                  onChange={(e) => {
                    void onPhotoPick(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
              <div className="text-sm text-slate-500">
                <p>Upload photo (optional). JPG, PNG, or WEBP.</p>
                
                {form.photoUrl && !photoLoading ? (
                  <button
                    type="button"
                    onClick={() => update('photoUrl', '')}
                    className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            <SectionHeading icon={<User size={14} />} title="Personal Information" />
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField label="First Name" required><input className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></FormField>
              <FormField label="Middle Name"><input className="input" value={form.middleName} onChange={(e) => update('middleName', e.target.value)} /></FormField>
              <FormField label="Last Name" required><input className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></FormField>
              <FormField label="Digital ID (RFID)">
                <input
                  className="input font-mono read-only:bg-slate-50 read-only:text-slate-600"
                  value={digitalId ?? ''}
                  readOnly
                  placeholder="Assigned by Super Admin"
                />
                <p className="mt-1 text-xs text-slate-500">Gate attendance RFID — contact Super Admin to assign or update.</p>
              </FormField>
              <FormField label="Date of Birth" required><input type="date" className="input" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></FormField>
              <FormField label="Gender" required className="sm:col-span-2">
                <RadioGroup name="gender" value={form.gender} onChange={(v) => update('gender', v)} options={[
                  { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other' }, { value: 'PREFER_NOT_TO_SAY', label: 'Prefer Not to Say' },
                ]} />
              </FormField>
            </div>
            <SectionHeading icon={<MapPin size={14} />} title="Birth Information" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SearchableSelect label="Country of Birth" required value={form.countryOfBirth} onChange={(v) => update('countryOfBirth', v)} options={COUNTRIES} />
              <FormField label="Province / State of Birth"><input className="input" value={form.provinceOfBirth} onChange={(e) => update('provinceOfBirth', e.target.value)} placeholder="Type province or state" /></FormField>
              <FormField label="District / City of Birth" required><input className="input" value={form.districtOfBirth} onChange={(e) => update('districtOfBirth', e.target.value)} /></FormField>
              <FormField label="Sector / Area of Birth"><input className="input" value={form.sectorOfBirth} onChange={(e) => update('sectorOfBirth', e.target.value)} /></FormField>
            </div>
            <SectionHeading icon={<MapPin size={14} />} title="Current Residence" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SearchableSelect label="Country of Residence" required value={form.residenceCountry} onChange={(v) => update('residenceCountry', v)} options={COUNTRIES} />
              <FormField label="Province / State"><input className="input" value={form.residenceProvince} onChange={(e) => update('residenceProvince', e.target.value)} placeholder="Type province or state" /></FormField>
              <FormField label="District / City" required><input className="input" value={form.residenceDistrict} onChange={(e) => update('residenceDistrict', e.target.value)} /></FormField>
              <FormField label="Sector / Area"><input className="input" value={form.residenceSector} onChange={(e) => update('residenceSector', e.target.value)} /></FormField>
              <FormField label="Village / Street" className="sm:col-span-2"><input className="input" value={form.residenceVillage} onChange={(e) => update('residenceVillage', e.target.value)} /></FormField>
            </div>
            <SectionHeading icon={<User size={14} />} title="Nationality Information" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SearchableSelect label="Nationality" required value={form.nationality} onChange={(v) => update('nationality', v)} options={COUNTRIES} />
              <SearchableSelect label="Second Nationality" value={form.secondNationality} onChange={(v) => update('secondNationality', v)} options={['', ...COUNTRIES]} />
              <SelectField label="Citizenship Status" value={form.citizenshipStatus} onChange={(v) => update('citizenshipStatus', v)} options={CITIZENSHIP_STATUSES.map((s) => ({ value: s, label: s }))} />
              <SelectField label="Marital Status" value={form.maritalStatus} onChange={(v) => update('maritalStatus', v)} options={MARITAL_STATUSES.map((s) => ({ value: s, label: s }))} placeholder="Select status" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <SectionHeading icon={<Phone size={14} />} title="Personal Contact" />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Personal Email" required><input type="email" className="input" value={form.personalEmail} onChange={(e) => update('personalEmail', e.target.value)} /></FormField>
              <FormField label="Mobile Phone" required><input className="input" value={form.mobilePhone} onChange={(e) => update('mobilePhone', e.target.value)} /></FormField>
              <FormField label="Alternative Phone"><input className="input" value={form.alternativePhone} onChange={(e) => update('alternativePhone', e.target.value)} /></FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <SectionHeading icon={<CreditCard size={14} />} title="Identification" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Identification Type" required value={form.idType} onChange={(v) => update('idType', v)} options={ID_TYPES.map((t) => ({ value: t, label: t }))} />
              <FormField label="Identification Number" required><input className="input" value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} /></FormField>
              <SearchableSelect label="Country of Issue" value={form.idCountry} onChange={(v) => update('idCountry', v)} options={COUNTRIES} />
              <FormField label="Social Security Number"><input className="input" value={form.socialSecurity} onChange={(e) => update('socialSecurity', e.target.value)} /></FormField>
            </div>
            <SectionHeading icon={<CreditCard size={14} />} title="Banking Information (Optional)" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SearchableSelect label="Bank Name" value={form.bankName} onChange={(v) => update('bankName', v)} options={RWANDA_BANKS} />
              {form.bankName === 'Other' && <FormField label="Specify Bank Name"><input className="input" value={form.bankNameOther} onChange={(e) => update('bankNameOther', e.target.value)} /></FormField>}
              <FormField label="Account Holder Name"><input className="input" value={form.accountHolder} onChange={(e) => update('accountHolder', e.target.value)} /></FormField>
              <FormField label="Account Number"><input className="input" value={form.accountNumber} onChange={(e) => update('accountNumber', e.target.value)} /></FormField>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <SectionHeading icon={<Briefcase size={14} />} title="Employment Information" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Department" required value={form.departmentId} onChange={(v) => update('departmentId', v)} options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder={departments.length ? 'Select department' : 'No departments — create one first'} />
              <FormField label="Position" required>
                <StaffPositionSelect value={form.position} onChange={(v) => update('position', v)} label="" required />
              </FormField>
              <SelectField label="Employment Type" required value={form.employmentType} onChange={(v) => update('employmentType', v)} options={EMPLOYMENT_TYPES} />
              <SelectField label="Employment Status" required value={form.employmentStatus} onChange={(v) => update('employmentStatus', v)} options={EMPLOYMENT_STATUSES} />
              <FormField label="Date Hired" required><input type="date" className="input" value={form.hireDate} onChange={(e) => update('hireDate', e.target.value)} /></FormField>
              <FormField label="Probation End Date"><input type="date" className="input" value={form.probationEndDate} onChange={(e) => update('probationEndDate', e.target.value)} /></FormField>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="ongoing" checked={form.ongoingContract} onChange={(e) => update('ongoingContract', e.target.checked)} className="h-5 w-5 accent-[#FCB038]" />
                <label htmlFor="ongoing" className="text-sm font-semibold text-[#000435]">Ongoing contract</label>
              </div>
              {!form.ongoingContract && <FormField label="Contract End Date"><input type="date" className="input" value={form.contractEnd} onChange={(e) => update('contractEnd', e.target.value)} /></FormField>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Highest Education Level" value={form.educationLevel} onChange={(v) => update('educationLevel', v)} options={EDUCATION_LEVELS.map((l) => ({ value: l, label: l }))} placeholder="Select level" />
            <FormField label="Institution"><input className="input" value={form.institution} onChange={(e) => update('institution', e.target.value)} /></FormField>
            <FormField label="Graduation Year"><input type="number" className="input" value={form.graduationYear} onChange={(e) => update('graduationYear', e.target.value)} /></FormField>
            <FormField label="Professional Certifications" className="sm:col-span-2"><textarea className="input min-h-[80px]" value={form.certifications} onChange={(e) => update('certifications', e.target.value)} /></FormField>
            <FormField label="Skills" className="sm:col-span-2"><textarea className="input min-h-[80px]" value={form.skills} onChange={(e) => update('skills', e.target.value)} /></FormField>
            <div className="sm:col-span-2"><MultiSelectChips label="Languages Spoken" options={LANGUAGES} value={form.languages} onChange={(v) => update('languages', v)} /></div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <SectionHeading icon={<Briefcase size={14} />} title="Salary Information" />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Basic Salary"><input type="number" className="input" value={form.basicSalary} onChange={(e) => update('basicSalary', e.target.value)} placeholder="Optional" /></FormField>
              <FormField label="Net Salary"><input type="number" className="input" value={form.netSalary} onChange={(e) => update('netSalary', e.target.value)} placeholder="Optional" /></FormField>
              <FormField label="Currency"><input className="input" value={form.currency} onChange={(e) => update('currency', e.target.value)} /></FormField>
              <SelectField label="Payment Frequency" value={form.paymentFrequency} onChange={(v) => update('paymentFrequency', v)} options={PAYMENT_FREQUENCIES.map((p) => ({ value: p, label: p }))} />
            </div>
            <MultiSelectChips label="Benefits" options={BENEFITS} value={form.benefits} onChange={(v) => update('benefits', v)} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <SectionHeading icon={<Heart size={14} />} title="Next of Kin" />
            <div className="space-y-5">
              {form.nextOfKinList.map((entry, index) => (
                <KinEntryFields
                  key={entry.id}
                  entry={entry}
                  index={index}
                  required={index === 0}
                  onChange={(patch) => updateKinEntry(entry.id, patch)}
                  onRemove={() => removeKinEntry(entry.id)}
                  canRemove={form.nextOfKinList.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addKinEntry}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#000435]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#000435] hover:border-[#FCB038]/50 hover:bg-[#FCB038]/5"
            >
              <Plus size={16} />
              Add another next of kin
            </button>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8">
            <SectionHeading icon={<Upload size={14} />} title="Document Uploads (All Optional)" />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {DOCUMENT_FIELDS.map((d) => (
                <FileUploadBox key={d.key} label={d.label} hint="Optional" file={docs[d.key]} accept="image/*,.pdf,.doc,.docx" onPick={(f) => setDocs((prev) => ({ ...prev, [d.key]: f }))} />
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="HR Notes / Internal Comments"><textarea className="input min-h-[90px]" value={form.hrNotes} onChange={(e) => update('hrNotes', e.target.value)} /></FormField>
              <FormField label="Recruitment Source"><input className="input" value={form.recruitmentSource} onChange={(e) => update('recruitmentSource', e.target.value)} placeholder="e.g. LinkedIn, Referral" /></FormField>
            </div>
            <MultiSelectChips label="Employee Tags" options={EMPLOYEE_TAGS} value={form.employeeTags} onChange={(v) => update('employeeTags', v)} />

            <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
              <input type="checkbox" checked={form.enablePortal} onChange={(e) => update('enablePortal', e.target.checked)} className="h-5 w-5 accent-[#FCB038]" />
              <span className="text-sm font-semibold text-[#000435]">Create user account / portal access</span>
            </label>
            {form.enablePortal && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Login Email" className="sm:col-span-2">
                  <input type="email" className="input" value={form.loginEmail} onChange={(e) => update('loginEmail', e.target.value)} placeholder={form.personalEmail || 'Enter login email'} />
                </FormField>
                <PasswordField label="Password" value={form.password} onChange={(v) => update('password', v)} />
                <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} />
                <FormField label="Assign Role"><input className="input" value={form.assignedRole} onChange={(e) => update('assignedRole', e.target.value)} placeholder="Optional" /></FormField>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <SummarySection icon={<User size={14} />} title="Personal" rows={[
                { label: 'Name', value: `${form.firstName} ${form.lastName}`.trim() },
                { label: 'DOB', value: form.dateOfBirth || '—' },
                { label: 'Nationality', value: form.nationality || '—' },
              ]} />
              <SummarySection icon={<Phone size={14} />} title="Contact" rows={[
                { label: 'Mobile', value: form.mobilePhone || '—' },
                { label: 'Email', value: form.personalEmail || '—' },
              ]} />
              <SummarySection icon={<Briefcase size={14} />} title="Employment" rows={[
                { label: 'Department', value: deptName },
                { label: 'Position', value: form.position || '—' },
                { label: 'Hire Date', value: form.hireDate || '—' },
              ]} />
              <SummarySection icon={<Heart size={14} />} title="Next of Kin" rows={[
                { label: 'Contacts', value: `${form.nextOfKinList.filter((k) => k.name.trim()).length} listed` },
                { label: 'Primary', value: form.nextOfKinList[0]?.name || '—' },
              ]} />
              <SummarySection icon={<Upload size={14} />} title="Documents" rows={[
                { label: 'Attached', value: `${attachedDocs} file(s)` },
              ]} />
            </div>
          </div>
        )}
      </HrStepWizard>
    </HrPageLayout>
  );
}

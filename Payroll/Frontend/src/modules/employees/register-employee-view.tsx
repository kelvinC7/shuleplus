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
  Upload,
  User,
  Users,
} from 'lucide-react';
import { EmployeeImportModal } from '@/components/employee-import-modal';
import { FormField, HrStepWizard, RadioGroup, SelectField } from '@/components/payroll-step-wizard';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { payrollApi } from '@/services/payroll-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { downloadTemplate } from '@/utils/payrollEmployeeImportTemplate';
import {
  BENEFITS,
  CITIZENSHIP_STATUSES,
  COMMUNICATION_PREFS,
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
  MOBILE_WALLETS,
  PAYMENT_FREQUENCIES,
  RWANDA_BANKS,
  RWANDA_PROVINCES,
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
  { title: 'Contact Information', description: 'Personal and emergency contact details.' },
  { title: 'Identification & Banking', description: 'ID documents and optional banking.' },
  { title: 'Employment Information', description: 'Job details, department and contract.' },
  { title: 'Education & Qualifications', description: 'Academic background and skills.' },
  { title: 'Salary & Benefits', description: 'Compensation and benefits (optional).' },
  { title: 'Next of Kin', description: 'Primary and secondary emergency contacts.' },
  { title: 'Documents & Review', description: 'Optional uploads and final review.' },
];

const INITIAL_FORM = {
  photoUrl: '',
  firstName: '', middleName: '', lastName: '', preferredName: '',
  dateOfBirth: '', gender: 'MALE',
  countryOfBirth: 'Rwanda', provinceOfBirth: '', districtOfBirth: '', sectorOfBirth: '', placeOfBirth: '',
  residenceCountry: 'Rwanda', residenceProvince: '', residenceDistrict: '', residenceSector: '',
  residenceVillage: '', houseNumber: '', postalCode: '', address: '',
  nationality: 'Rwanda', secondNationality: '', citizenshipStatus: 'Citizen', maritalStatus: '',
  personalEmail: '', workEmail: '', mobilePhone: '', alternativePhone: '', whatsapp: '',
  emergencyName: '', emergencyPhone: '', emergencyEmail: '',
  communicationPrefs: [] as string[],
  idType: 'National ID', idNumber: '', idIssueDate: '', idExpiryDate: '', idCountry: 'Rwanda',
  taxNumber: '', socialSecurity: '', pensionNumber: '',
  bankName: '', bankNameOther: '', branchName: '', accountHolder: '', accountNumber: '', swiftCode: '',
  mobileWallet: '', mobileWalletOther: '', mobileWalletNumber: '',
  branch: '', departmentId: '', position: '', jobTitle: '', supervisor: '',
  employmentType: 'PERMANENT', employmentStatus: 'ACTIVE',
  hireDate: '', probationEndDate: '', contractEnd: '', ongoingContract: false,
  educationLevel: '', institution: '', graduationYear: '', certifications: '', skills: '',
  languages: [] as string[],
  basicSalary: '', netSalary: '', currency: 'RWF', paymentFrequency: 'Monthly',
  benefits: [] as string[],
  nextOfKinName: '', nextOfKinRelation: '', nextOfKinRelationOther: '',
  nextOfKinPhone: '', nextOfKinAltPhone: '', nextOfKinEmail: '', nextOfKinOccupation: '',
  nextOfKinAddress: '', nextOfKinCountry: '', nextOfKinCity: '',
  secondaryKinName: '', secondaryKinRelation: '', secondaryKinRelationOther: '',
  secondaryKinPhone: '', secondaryKinAltPhone: '', secondaryKinEmail: '',
  secondaryKinOccupation: '', secondaryKinAddress: '', secondaryKinCountry: '', secondaryKinCity: '',
  hrNotes: '', recruitmentSource: '', employeeTags: [] as string[],
  enablePortal: false, loginEmail: '', password: '', confirmPassword: '',
  assignedRole: '', assignedPermissions: [] as string[],
};

type Department = { id: string; name: string; code?: string };

interface Props {
  staffId?: string;
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

function resolveWallet(name: string) {
  if (!name) return { mobileWallet: '', mobileWalletOther: '' };
  if (MOBILE_WALLETS.includes(name)) return { mobileWallet: name, mobileWalletOther: '' };
  return { mobileWallet: 'Other', mobileWalletOther: name };
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
  const nokRel = resolveRelation(String(nok.relation ?? ''));
  const skRel = resolveRelation(String(sk.relation ?? ''));
  const bank = resolveBankName(String(banking.bankName ?? ''));
  const wallet = resolveWallet(String(banking.mobileWallet ?? ''));

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
    address: e.address ?? '',
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
    preferredName: String(personal.preferredName ?? ''),
    countryOfBirth: String(personal.countryOfBirth ?? 'Rwanda'),
    provinceOfBirth: String(personal.provinceOfBirth ?? ''),
    districtOfBirth: String(personal.districtOfBirth ?? ''),
    sectorOfBirth: String(personal.sectorOfBirth ?? ''),
    placeOfBirth: String(personal.placeOfBirth ?? ''),
    residenceCountry: String(personal.residenceCountry ?? 'Rwanda'),
    residenceProvince: String(personal.residenceProvince ?? ''),
    residenceDistrict: String(personal.residenceDistrict ?? ''),
    residenceSector: String(personal.residenceSector ?? ''),
    residenceVillage: String(personal.residenceVillage ?? ''),
    houseNumber: String(personal.houseNumber ?? ''),
    postalCode: String(personal.postalCode ?? ''),
    nationality: String(personal.nationality ?? 'Rwanda'),
    secondNationality: String(personal.secondNationality ?? ''),
    citizenshipStatus: String(personal.citizenshipStatus ?? 'Citizen'),
    maritalStatus: String(personal.maritalStatus ?? ''),
    workEmail: String(contact.workEmail ?? ''),
    alternativePhone: String(contact.alternativePhone ?? ''),
    whatsapp: String(contact.whatsapp ?? ''),
    emergencyName: String(contact.emergencyName ?? ''),
    emergencyPhone: String(contact.emergencyPhone ?? ''),
    emergencyEmail: String(contact.emergencyEmail ?? ''),
    communicationPrefs: Array.isArray(contact.communicationPrefs) ? (contact.communicationPrefs as string[]) : [],
    idType: String(identification.idType ?? 'National ID'),
    idIssueDate: String(identification.issueDate ?? ''),
    idExpiryDate: String(identification.expiryDate ?? ''),
    idCountry: String(identification.countryOfIssue ?? 'Rwanda'),
    taxNumber: String(identification.taxNumber ?? ''),
    socialSecurity: String(identification.socialSecurity ?? ''),
    pensionNumber: String(identification.pensionNumber ?? ''),
    bankName: bank.bankName,
    bankNameOther: bank.bankNameOther,
    branchName: String(banking.branchName ?? ''),
    accountHolder: String(banking.accountHolder ?? ''),
    accountNumber: String(banking.accountNumber ?? ''),
    swiftCode: String(banking.swiftCode ?? ''),
    mobileWallet: wallet.mobileWallet,
    mobileWalletOther: wallet.mobileWalletOther,
    mobileWalletNumber: String(banking.mobileWalletNumber ?? ''),
    branch: String(employment.branch ?? ''),
    jobTitle: String(employment.jobTitle ?? ''),
    supervisor: String(employment.supervisor ?? ''),
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
    nextOfKinName: String(nok.name ?? ''),
    nextOfKinRelation: nokRel.relation,
    nextOfKinRelationOther: nokRel.relationOther,
    nextOfKinPhone: String(nok.phone ?? ''),
    nextOfKinAltPhone: String(nok.altPhone ?? ''),
    nextOfKinEmail: String(nok.email ?? ''),
    nextOfKinOccupation: String(nok.occupation ?? ''),
    nextOfKinAddress: String(nok.address ?? ''),
    nextOfKinCountry: String(nok.country ?? ''),
    nextOfKinCity: String(nok.city ?? ''),
    secondaryKinName: String(sk.name ?? ''),
    secondaryKinRelation: skRel.relation,
    secondaryKinRelationOther: skRel.relationOther,
    secondaryKinPhone: String(sk.phone ?? ''),
    secondaryKinAltPhone: String(sk.altPhone ?? ''),
    secondaryKinEmail: String(sk.email ?? ''),
    secondaryKinOccupation: String(sk.occupation ?? ''),
    secondaryKinAddress: String(sk.address ?? ''),
    secondaryKinCountry: String(sk.country ?? ''),
    secondaryKinCity: String(sk.city ?? ''),
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

function KinFields({
  prefix,
  form,
  update,
}: {
  prefix: 'nextOfKin' | 'secondaryKin';
  form: typeof INITIAL_FORM;
  update: (field: string, value: string) => void;
}) {
  const relation = form[`${prefix}Relation` as keyof typeof form] as string;
  const relationOther = form[`${prefix}RelationOther` as keyof typeof form] as string;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField label="Full Name" required={prefix === 'nextOfKin'}>
        <input className="input" value={form[`${prefix}Name` as keyof typeof form] as string} onChange={(e) => update(`${prefix}Name`, e.target.value)} />
      </FormField>
      <SearchableSelect label="Relationship" required={prefix === 'nextOfKin'} value={relation} onChange={(v) => update(`${prefix}Relation`, v)} options={KIN_RELATIONS} />
      {relation === 'Other' && (
        <FormField label="Specify Relationship" className="sm:col-span-2">
          <input className="input" value={relationOther} onChange={(e) => update(`${prefix}RelationOther`, e.target.value)} />
        </FormField>
      )}
      <FormField label="Phone Number" required={prefix === 'nextOfKin'}>
        <input className="input" value={form[`${prefix}Phone` as keyof typeof form] as string} onChange={(e) => update(`${prefix}Phone`, e.target.value)} />
      </FormField>
      <FormField label="Alternative Phone">
        <input className="input" value={form[`${prefix}AltPhone` as keyof typeof form] as string} onChange={(e) => update(`${prefix}AltPhone`, e.target.value)} />
      </FormField>
      <FormField label="Email">
        <input type="email" className="input" value={form[`${prefix}Email` as keyof typeof form] as string} onChange={(e) => update(`${prefix}Email`, e.target.value)} />
      </FormField>
      <FormField label="Occupation">
        <input className="input" value={form[`${prefix}Occupation` as keyof typeof form] as string} onChange={(e) => update(`${prefix}Occupation`, e.target.value)} />
      </FormField>
      <FormField label="Address" className="sm:col-span-2">
        <input className="input" value={form[`${prefix}Address` as keyof typeof form] as string} onChange={(e) => update(`${prefix}Address`, e.target.value)} />
      </FormField>
      <SearchableSelect label="Country" value={form[`${prefix}Country` as keyof typeof form] as string} onChange={(v) => update(`${prefix}Country`, v)} options={COUNTRIES} />
      <FormField label="City / District">
        <input className="input" value={form[`${prefix}City` as keyof typeof form] as string} onChange={(e) => update(`${prefix}City`, e.target.value)} />
      </FormField>
    </div>
  );
}

export function RegisterEmployeeView({ staffId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [docs, setDocs] = useState<Record<DocumentFieldKey, File | null>>(
    Object.fromEntries(DOCUMENT_FIELDS.map((d) => [d.key, null])) as Record<DocumentFieldKey, File | null>
  );

  useEffect(() => {
    payrollApi.listHrDepartments().then(({ data }) => setDepartments(data.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!staffId) return;
    payrollApi.getStaff(staffId).then(({ data }) => {
      const s = data.data;
      const dept = departments.find((d) => d.name === s.department);
      setForm(hydrateFromEmployee({
        firstName: s.firstName,
        middleName: String((s.hrProfile as Record<string, unknown>)?.middleName ?? ''),
        lastName: s.lastName,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth ?? new Date().toISOString(),
        email: s.email,
        phone: s.phone ?? '',
        address: String((s.hrProfile as Record<string, Record<string, string>>)?.personal?.address ?? ''),
        nationalId: s.nationalId,
        departmentId: dept?.id ?? '',
        position: s.position ?? 'Staff',
        contractType: String((s.hrProfile as Record<string, string>)?.contractType ?? 'PERMANENT'),
        status: s.status,
        hireDate: s.hireDate ?? new Date().toISOString(),
        contractEnd: null,
        ongoingContract: true,
        basicSalary: s.basicSalary,
        netSalary: null,
        photoUrl: null,
        hrProfile: (s.hrProfile as Record<string, unknown>) ?? {},
      }));
    }).catch(() => undefined);
  }, [staffId, departments]);

  function update(field: string, value: string | boolean | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onPhotoPick(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('photoUrl', String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  async function uploadPendingDocuments(_employeeIdValue: string) {
    // Document upload is managed in HR; payroll registration stores profile metadata only.
  }

  function buildPayload() {
    const gender = form.gender === 'PREFER_NOT_TO_SAY' ? 'OTHER' : form.gender;
    return {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      gender,
      dateOfBirth: form.dateOfBirth,
      email: form.personalEmail.trim() || null,
      phone: form.mobilePhone.trim(),
      address: form.address.trim() || null,
      nationalId: form.idNumber.trim() || null,
      photoUrl: form.photoUrl || null,
      departmentId: form.departmentId || null,
      position: form.position.trim() || form.jobTitle.trim(),
      contractType: form.employmentType,
      status: form.employmentStatus,
      hireDate: form.hireDate,
      contractEnd: form.ongoingContract ? null : form.contractEnd || null,
      ongoingContract: form.ongoingContract,
      basicSalary: form.basicSalary ? Number(form.basicSalary) : null,
      netSalary: form.netSalary ? Number(form.netSalary) : null,
      hrProfile: {
        personal: {
          preferredName: form.preferredName, countryOfBirth: form.countryOfBirth,
          provinceOfBirth: form.provinceOfBirth, districtOfBirth: form.districtOfBirth,
          sectorOfBirth: form.sectorOfBirth, placeOfBirth: form.placeOfBirth,
          residenceCountry: form.residenceCountry, residenceProvince: form.residenceProvince,
          residenceDistrict: form.residenceDistrict, residenceSector: form.residenceSector,
          residenceVillage: form.residenceVillage, houseNumber: form.houseNumber,
          postalCode: form.postalCode, nationality: form.nationality,
          secondNationality: form.secondNationality, citizenshipStatus: form.citizenshipStatus,
          maritalStatus: form.maritalStatus,
        },
        contact: {
          workEmail: form.workEmail, alternativePhone: form.alternativePhone, whatsapp: form.whatsapp,
          emergencyName: form.emergencyName, emergencyPhone: form.emergencyPhone,
          emergencyEmail: form.emergencyEmail, communicationPrefs: form.communicationPrefs,
        },
        identification: {
          idType: form.idType, issueDate: form.idIssueDate, expiryDate: form.idExpiryDate,
          countryOfIssue: form.idCountry, taxNumber: form.taxNumber,
          socialSecurity: form.socialSecurity, pensionNumber: form.pensionNumber,
        },
        banking: {
          bankName: form.bankName === 'Other' ? form.bankNameOther : form.bankName,
          branchName: form.branchName, accountHolder: form.accountHolder,
          accountNumber: form.accountNumber, swiftCode: form.swiftCode,
          mobileWallet: form.mobileWallet === 'Other' ? form.mobileWalletOther : form.mobileWallet,
          mobileWalletNumber: form.mobileWalletNumber,
        },
        employment: {
          branch: form.branch, jobTitle: form.jobTitle, supervisor: form.supervisor,
          probationEndDate: form.probationEndDate,
        },
        education: {
          educationLevel: form.educationLevel, institution: form.institution,
          graduationYear: form.graduationYear, certifications: form.certifications,
          skills: form.skills, languages: form.languages,
        },
        salary: {
          currency: form.currency, paymentFrequency: form.paymentFrequency, benefits: form.benefits,
        },
        nextOfKin: {
          name: form.nextOfKinName, relation: form.nextOfKinRelation === 'Other' ? form.nextOfKinRelationOther : form.nextOfKinRelation,
          phone: form.nextOfKinPhone, altPhone: form.nextOfKinAltPhone, email: form.nextOfKinEmail,
          occupation: form.nextOfKinOccupation, address: form.nextOfKinAddress,
          country: form.nextOfKinCountry, city: form.nextOfKinCity,
        },
        secondaryKin: {
          name: form.secondaryKinName,
          relation: form.secondaryKinRelation === 'Other' ? form.secondaryKinRelationOther : form.secondaryKinRelation,
          phone: form.secondaryKinPhone, altPhone: form.secondaryKinAltPhone, email: form.secondaryKinEmail,
          occupation: form.secondaryKinOccupation, address: form.secondaryKinAddress,
          country: form.secondaryKinCountry, city: form.secondaryKinCity,
        },
        hrNotes: form.hrNotes, recruitmentSource: form.recruitmentSource, employeeTags: form.employeeTags,
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

  function toPayrollPayload(payload: ReturnType<typeof buildPayload>, deptName: string) {
    const banking = (payload.hrProfile.banking ?? {}) as Record<string, string>;
    const identification = (payload.hrProfile.identification ?? {}) as Record<string, string>;
    return {
      firstName: payload.firstName,
      lastName: payload.lastName,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
      email: payload.email,
      phone: payload.phone,
      nationalId: payload.nationalId,
      rssbNumber: identification.socialSecurity || identification.pensionNumber || null,
      department: deptName || null,
      position: payload.position,
      status: payload.status,
      hireDate: payload.hireDate,
      bankName: banking.bankName || null,
      bankAccount: banking.accountNumber || null,
      basicSalary: payload.basicSalary ?? 0,
      hrProfile: { ...payload.hrProfile, contractType: payload.contractType, middleName: payload.middleName },
    };
  }

  async function submit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.mobilePhone.trim()) {
      toast.warning('Please complete first name, last name, and mobile phone.', 'Required fields');
      return;
    }
    if (!form.dateOfBirth || !form.address.trim() || !form.nationality || !form.idNumber.trim() || !form.hireDate) {
      toast.warning('Complete required fields on Basic, Contact, Identification and Employment steps.', 'Required fields');
      return;
    }
    if (!form.nextOfKinName.trim() || !form.nextOfKinRelation || !form.nextOfKinPhone.trim()) {
      toast.warning('Please complete primary next of kin details.', 'Required fields');
      return;
    }
    if (form.enablePortal && form.password && form.password !== form.confirmPassword) {
      toast.error('The passwords you entered do not match.', 'Password mismatch');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const payrollPayload = toPayrollPayload(payload, deptName === '—' ? '' : deptName);
      if (staffId) {
        await payrollApi.updateStaff(staffId, payrollPayload);
        toast.success(`${form.firstName} ${form.lastName} was updated successfully.`, 'Employee updated');
        router.push(`/employees/${staffId}`);
      } else {
        const { data } = await payrollApi.createStaff(payrollPayload);
        toast.success(`${form.firstName} ${form.lastName} has been registered.`, 'Registration complete');
        router.push(`/employees/${data.data.id}`);
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
    <PayrollPageLayout>
      <EmployeeImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      {!staffId && (
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
        onCancel={() => router.push('/employees')}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
        onSubmit={submit}
        isLastStep={step === 7}
        saving={saving}
        submitLabel={staffId ? 'Save Changes' : 'Submit Registration'}
      >
        {step === 0 && (
          <div className="space-y-8">
            <SectionHeading icon={<Camera size={14} />} title="Profile Photo" />
            <div className="flex items-center gap-4">
              <label className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-[#FCB038]/30 bg-[#000435] text-[#FCB038]">
                {form.photoUrl ? <img src={form.photoUrl} alt="Profile" className="h-full w-full object-cover" /> : <Camera size={32} />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhotoPick(e.target.files?.[0] ?? null)} />
              </label>
              <p className="text-sm text-slate-500">Upload photo (optional). JPG, PNG, WEBP.</p>
            </div>
            <SectionHeading icon={<User size={14} />} title="Personal Information" />
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField label="First Name" required><input className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></FormField>
              <FormField label="Middle Name"><input className="input" value={form.middleName} onChange={(e) => update('middleName', e.target.value)} /></FormField>
              <FormField label="Last Name" required><input className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></FormField>
              <FormField label="Preferred Name / Nickname"><input className="input" value={form.preferredName} onChange={(e) => update('preferredName', e.target.value)} /></FormField>
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
              <SearchableSelect label="Province / State of Birth" value={form.provinceOfBirth} onChange={(v) => update('provinceOfBirth', v)} options={RWANDA_PROVINCES} />
              <FormField label="District / City of Birth" required><input className="input" value={form.districtOfBirth} onChange={(e) => update('districtOfBirth', e.target.value)} /></FormField>
              <FormField label="Sector / Area of Birth"><input className="input" value={form.sectorOfBirth} onChange={(e) => update('sectorOfBirth', e.target.value)} /></FormField>
              <FormField label="Place of Birth" className="sm:col-span-2"><input className="input" value={form.placeOfBirth} onChange={(e) => update('placeOfBirth', e.target.value)} placeholder="Hospital / Village / Town" /></FormField>
            </div>
            <SectionHeading icon={<MapPin size={14} />} title="Current Residence" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SearchableSelect label="Country of Residence" required value={form.residenceCountry} onChange={(v) => update('residenceCountry', v)} options={COUNTRIES} />
              <SearchableSelect label="Province / State" value={form.residenceProvince} onChange={(v) => update('residenceProvince', v)} options={RWANDA_PROVINCES} />
              <FormField label="District / City" required><input className="input" value={form.residenceDistrict} onChange={(e) => update('residenceDistrict', e.target.value)} /></FormField>
              <FormField label="Sector / Area"><input className="input" value={form.residenceSector} onChange={(e) => update('residenceSector', e.target.value)} /></FormField>
              <FormField label="Village / Street"><input className="input" value={form.residenceVillage} onChange={(e) => update('residenceVillage', e.target.value)} /></FormField>
              <FormField label="House Number"><input className="input" value={form.houseNumber} onChange={(e) => update('houseNumber', e.target.value)} /></FormField>
              <FormField label="Postal Code"><input className="input" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} /></FormField>
              <FormField label="Current Address" required className="sm:col-span-2"><textarea className="input min-h-[80px]" value={form.address} onChange={(e) => update('address', e.target.value)} /></FormField>
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
              <FormField label="Work Email"><input type="email" className="input" value={form.workEmail} onChange={(e) => update('workEmail', e.target.value)} /></FormField>
              <FormField label="Mobile Phone" required><input className="input" value={form.mobilePhone} onChange={(e) => update('mobilePhone', e.target.value)} /></FormField>
              <FormField label="Alternative Phone"><input className="input" value={form.alternativePhone} onChange={(e) => update('alternativePhone', e.target.value)} /></FormField>
              <FormField label="WhatsApp Number"><input className="input" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} /></FormField>
            </div>
            <SectionHeading icon={<Users size={14} />} title="Emergency Contact" />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Emergency Contact Name"><input className="input" value={form.emergencyName} onChange={(e) => update('emergencyName', e.target.value)} /></FormField>
              <FormField label="Emergency Contact Phone"><input className="input" value={form.emergencyPhone} onChange={(e) => update('emergencyPhone', e.target.value)} /></FormField>
              <FormField label="Emergency Contact Email" className="sm:col-span-2"><input type="email" className="input" value={form.emergencyEmail} onChange={(e) => update('emergencyEmail', e.target.value)} /></FormField>
            </div>
            <MultiSelectChips label="Communication Preference" options={COMMUNICATION_PREFS} value={form.communicationPrefs} onChange={(v) => update('communicationPrefs', v)} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <SectionHeading icon={<CreditCard size={14} />} title="Identification" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Identification Type" required value={form.idType} onChange={(v) => update('idType', v)} options={ID_TYPES.map((t) => ({ value: t, label: t }))} />
              <FormField label="Identification Number" required><input className="input" value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} /></FormField>
              <FormField label="Issue Date"><input type="date" className="input" value={form.idIssueDate} onChange={(e) => update('idIssueDate', e.target.value)} /></FormField>
              <FormField label="Expiry Date"><input type="date" className="input" value={form.idExpiryDate} onChange={(e) => update('idExpiryDate', e.target.value)} /></FormField>
              <SearchableSelect label="Country of Issue" value={form.idCountry} onChange={(v) => update('idCountry', v)} options={COUNTRIES} />
            </div>
            <SectionHeading icon={<CreditCard size={14} />} title="Tax Information" />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Tax Number (TIN)"><input className="input" value={form.taxNumber} onChange={(e) => update('taxNumber', e.target.value)} /></FormField>
              <FormField label="Social Security Number"><input className="input" value={form.socialSecurity} onChange={(e) => update('socialSecurity', e.target.value)} /></FormField>
              <FormField label="Pension Number"><input className="input" value={form.pensionNumber} onChange={(e) => update('pensionNumber', e.target.value)} /></FormField>
            </div>
            <SectionHeading icon={<CreditCard size={14} />} title="Banking Information (Optional)" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SearchableSelect label="Bank Name" value={form.bankName} onChange={(v) => update('bankName', v)} options={RWANDA_BANKS} />
              {form.bankName === 'Other' && <FormField label="Specify Bank Name"><input className="input" value={form.bankNameOther} onChange={(e) => update('bankNameOther', e.target.value)} /></FormField>}
              <FormField label="Branch Name"><input className="input" value={form.branchName} onChange={(e) => update('branchName', e.target.value)} /></FormField>
              <FormField label="Account Holder Name"><input className="input" value={form.accountHolder} onChange={(e) => update('accountHolder', e.target.value)} /></FormField>
              <FormField label="Account Number"><input className="input" value={form.accountNumber} onChange={(e) => update('accountNumber', e.target.value)} /></FormField>
              <FormField label="SWIFT Code"><input className="input" value={form.swiftCode} onChange={(e) => update('swiftCode', e.target.value)} /></FormField>
              <SearchableSelect label="Mobile Wallet" value={form.mobileWallet} onChange={(v) => update('mobileWallet', v)} options={MOBILE_WALLETS} />
              {form.mobileWallet === 'Other' && <FormField label="Specify Wallet"><input className="input" value={form.mobileWalletOther} onChange={(e) => update('mobileWalletOther', e.target.value)} /></FormField>}
              <FormField label="Mobile Wallet Number"><input className="input" value={form.mobileWalletNumber} onChange={(e) => update('mobileWalletNumber', e.target.value)} /></FormField>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <SectionHeading icon={<Briefcase size={14} />} title="Employment Information" />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Branch / Location"><input className="input" value={form.branch} onChange={(e) => update('branch', e.target.value)} placeholder="Optional" /></FormField>
              <SelectField label="Department" required value={form.departmentId} onChange={(v) => update('departmentId', v)} options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder={departments.length ? 'Select department' : 'No departments — create one first'} />
              <FormField label="Position" required><input className="input" value={form.position} onChange={(e) => update('position', e.target.value)} /></FormField>
              <FormField label="Job Title"><input className="input" value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} /></FormField>
              <FormField label="Supervisor / Manager"><input className="input" value={form.supervisor} onChange={(e) => update('supervisor', e.target.value)} /></FormField>
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
          <div className="space-y-10">
            <div>
              <SectionHeading icon={<Heart size={14} />} title="Primary Next of Kin" />
              <KinFields prefix="nextOfKin" form={form} update={update} />
            </div>
            <div>
              <SectionHeading icon={<Heart size={14} />} title="Secondary Next of Kin (Optional)" />
              <KinFields prefix="secondaryKin" form={form} update={update} />
            </div>
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
                { label: 'Name', value: form.nextOfKinName || '—' },
                { label: 'Phone', value: form.nextOfKinPhone || '—' },
              ]} />
              <SummarySection icon={<Upload size={14} />} title="Documents" rows={[
                { label: 'Attached', value: `${attachedDocs} file(s)` },
              ]} />
            </div>
          </div>
        )}
      </HrStepWizard>
    </PayrollPageLayout>
  );
}

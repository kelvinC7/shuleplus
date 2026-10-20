'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Calendar,
  CreditCard,
  Download,
  Edit,
  FileText,
  GraduationCap,
  Heart,
  Phone,
  Upload,
  User,
} from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { DOCUMENT_FIELDS } from '@/modules/registration/registration-constants';
import { downloadEmployeeDocument, uploadEmployeeDocument } from '@/utils/document-upload';
import type { Employee, EmployeeDocument } from '@/types';

const TABS = [
  'Overview',
  'Personal',
  'Contact',
  'Identification',
  'Employment',
  'Education',
  'Salary',
  'Next of Kin',
  'Documents',
  'System Access',
  'Leave',
  'More',
] as const;

type Tab = (typeof TABS)[number];
type HrSection = Record<string, unknown>;

function asSection(value: unknown): HrSection {
  return value && typeof value === 'object' ? (value as HrSection) : {};
}

function str(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function formatGender(value: string) {
  if (value === 'PREFER_NOT_TO_SAY') return 'Prefer not to say';
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '—';
  return value.join(', ');
}

function formatMoney(amount: number | null | undefined, currency = 'RWF') {
  if (amount == null) return '—';
  return `${amount.toLocaleString()} ${currency}`;
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-navy">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-border/50 pb-2 text-sm last:border-0">
            <span className="shrink-0 text-muted">{label}</span>
            <span className="text-right font-medium text-navy">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted">—</span>;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-lg bg-[#FCB038]/10 px-2 py-0.5 text-xs font-semibold text-[#000435]">
          {item}
        </span>
      ))}
    </div>
  );
}

function DocumentsPanel({
  employeeId,
  documents,
  onUploaded,
}: {
  employeeId: string;
  documents: EmployeeDocument[];
  onUploaded: () => void;
}) {
  const [category, setCategory] = useState<string>(DOCUMENT_FIELDS[0]?.category ?? 'Other');
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const toast = useToast();

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadEmployeeDocument(employeeId, category, file);
      toast.success('Document uploaded successfully.', 'Upload complete');
      onUploaded();
    } catch {
      toast.error('Failed to upload document.', 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(doc: EmployeeDocument) {
    if (!doc.hasFile) return;
    setDownloadingId(doc.id);
    try {
      await downloadEmployeeDocument(doc.id, doc.filename);
      toast.success('Download started.', 'Document');
    } catch {
      toast.error('Failed to download document.', 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dashed border-[#FCB038]/40 bg-[#FCB038]/[0.04] p-5">
        <h3 className="text-sm font-semibold text-navy">Upload document</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">
            Category
            <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              {DOCUMENT_FIELDS.map((d) => (
                <option key={d.key} value={d.category}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer flex-col justify-end">
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#000435]/90">
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Choose file'}
            </span>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-muted">No documents uploaded yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="shrink-0 text-red-500" size={24} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.filename}</p>
                  <p className="text-xs text-muted">{d.category}</p>
                  {d.createdAt && <p className="text-[10px] text-muted">{formatDate(d.createdAt)}</p>}
                </div>
              </div>
              {d.hasFile ? (
                <button
                  type="button"
                  onClick={() => onDownload(d)}
                  disabled={downloadingId === d.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-slate-200 disabled:opacity-50"
                >
                  <Download size={14} />
                  {downloadingId === d.id ? '…' : 'Download'}
                </button>
              ) : (
                <span className="text-[10px] text-amber-600">No file</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileView({ employeeId }: { employeeId: string }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');

  function reload() {
    hrApi.getEmployee(employeeId).then(({ data }) => setEmployee(data.data));
  }

  useEffect(() => {
    reload();
  }, [employeeId]);

  if (!employee) {
    return (
      <HrPageLayout title="Employee Profile" subtitle="Loading…">
        <p className="text-center text-muted">Loading employee profile…</p>
      </HrPageLayout>
    );
  }

  const profile = employee.hrProfile ?? {};
  const personal = asSection(profile.personal);
  const contact = asSection(profile.contact);
  const identification = asSection(profile.identification);
  const banking = asSection(profile.banking ?? profile.bank);
  const employment = asSection(profile.employment);
  const education = asSection(profile.education);
  const salary = asSection(profile.salary);
  const nextOfKin = asSection(profile.nextOfKin);
  const secondaryKin = asSection(profile.secondaryKin);
  const systemAccess = asSection(profile.systemAccess);
  const employeeTags = Array.isArray(profile.employeeTags) ? (profile.employeeTags as string[]) : [];
  const currency = str(salary.currency, 'RWF');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/directory" className="hover:text-ochre">Directory</Link>
        <span>/</span>
        <span className="text-navy">Employee Profile</span>
      </div>

      <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-5">
            <div className="relative">
              {employee.photoUrl ? (
                <img src={employee.photoUrl} alt={employee.fullName} className="h-24 w-24 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-navy/5 text-2xl font-bold text-navy">
                  {employee.firstName[0]}{employee.lastName[0]}
                </div>
              )}
              {employee.status === 'ACTIVE' && (
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy">{employee.fullName}</h1>
              {personal.preferredName ? (
                <p className="text-sm text-muted">Goes by {str(personal.preferredName)}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={employee.status} />
                <span className="text-sm text-muted">{employee.employeeNumber}</span>
                {employeeTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-md bg-[#FCB038]/15 px-2 py-0.5 text-[10px] font-bold text-[#000435]">{tag}</span>
                ))}
              </div>
              <p className="mt-1 text-muted">{employee.position} · {employee.department ?? 'Unassigned'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link href={`/directory/${employeeId}/edit`} className="btn-primary">
              <Edit size={16} /> Edit profile
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.print()}
            >
              <Download size={16} /> Print staff ID
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Joined', value: formatDate(employee.hireDate) },
            { label: 'Email', value: str(employee.email) },
            { label: 'Phone', value: employee.phone },
            { label: 'Nationality', value: str(personal.nationality) },
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-muted">{c.label}</p>
              <p className="text-sm font-medium text-navy">{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky top-0 z-10 overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <div className="flex min-w-max gap-1 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm whitespace-nowrap ${
                tab === t ? 'border-b-2 border-ochre font-semibold text-navy' : 'text-muted hover:text-navy'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {tab === 'Overview' && (
            <>
              <Section title="Personal Summary" rows={[
                ['Full name', employee.fullName],
                ['Preferred name', str(personal.preferredName)],
                ['Date of birth', formatDate(employee.dateOfBirth)],
                ['Gender', formatGender(employee.gender)],
                ['Nationality', str(personal.nationality)],
                ['Marital status', str(personal.maritalStatus)],
              ]} />
              <Section title="Contact Summary" rows={[
                ['Personal email', str(employee.email)],
                ['Work email', str(contact.workEmail)],
                ['Mobile', employee.phone],
                ['WhatsApp', str(contact.whatsapp)],
                ['Emergency contact', str(contact.emergencyName)],
              ]} />
              <Section title="Employment Summary" rows={[
                ['Department', str(employee.department)],
                ['Position', employee.position],
                ['Job title', str(employment.jobTitle, employee.position)],
                ['Employment type', employee.contractType],
                ['Status', employee.status],
                ['Supervisor', str(employment.supervisor)],
              ]} />
              <Section title="Compensation" rows={[
                ['Basic salary', formatMoney(employee.basicSalary, currency)],
                ['Net salary', formatMoney(employee.netSalary, currency)],
                ['Payment frequency', str(salary.paymentFrequency)],
                ['Benefits', formatList(salary.benefits)],
              ]} />
            </>
          )}

          {tab === 'Personal' && (
            <>
              <Section title="Personal Information" rows={[
                ['First name', employee.firstName],
                ['Middle name', str(employee.middleName)],
                ['Last name', employee.lastName],
                ['Preferred name', str(personal.preferredName)],
                ['Date of birth', formatDate(employee.dateOfBirth)],
                ['Gender', formatGender(employee.gender)],
                ['Marital status', str(personal.maritalStatus)],
              ]} />
              <Section title="Birth Information" rows={[
                ['Country of birth', str(personal.countryOfBirth)],
                ['Province / state', str(personal.provinceOfBirth)],
                ['District / city', str(personal.districtOfBirth)],
                ['Sector / area', str(personal.sectorOfBirth)],
                ['Place of birth', str(personal.placeOfBirth)],
              ]} />
              <Section title="Current Residence" rows={[
                ['Country', str(personal.residenceCountry)],
                ['Province / state', str(personal.residenceProvince)],
                ['District / city', str(personal.residenceDistrict)],
                ['Sector / area', str(personal.residenceSector)],
                ['Village / street', str(personal.residenceVillage)],
                ['House number', str(personal.houseNumber)],
                ['Postal code', str(personal.postalCode)],
                ['Current address', str(employee.address)],
              ]} />
              <Section title="Nationality Information" rows={[
                ['Nationality', str(personal.nationality)],
                ['Second nationality', str(personal.secondNationality)],
                ['Citizenship status', str(personal.citizenshipStatus)],
              ]} />
            </>
          )}

          {tab === 'Contact' && (
            <>
              <Section title="Personal Contact" rows={[
                ['Personal email', str(employee.email)],
                ['Work email', str(contact.workEmail)],
                ['Mobile phone', employee.phone],
                ['Alternative phone', str(contact.alternativePhone)],
                ['WhatsApp', str(contact.whatsapp)],
              ]} />
              <Section title="Emergency Contact" rows={[
                ['Name', str(contact.emergencyName)],
                ['Phone', str(contact.emergencyPhone)],
                ['Email', str(contact.emergencyEmail)],
              ]} />
              <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-navy">Communication Preferences</h3>
                <div className="mt-3">
                  <ChipList items={Array.isArray(contact.communicationPrefs) ? (contact.communicationPrefs as string[]) : []} />
                </div>
              </div>
            </>
          )}

          {tab === 'Identification' && (
            <>
              <Section title="Identification" rows={[
                ['ID type', str(identification.idType)],
                ['ID number', str(employee.nationalId)],
                ['Issue date', formatDate(identification.issueDate)],
                ['Expiry date', formatDate(identification.expiryDate)],
                ['Country of issue', str(identification.countryOfIssue)],
              ]} />
              <Section title="Tax Information" rows={[
                ['Tax number (TIN)', str(identification.taxNumber)],
                ['Social security', str(identification.socialSecurity)],
                ['Pension number', str(identification.pensionNumber)],
              ]} />
              <Section title="Banking Information" rows={[
                ['Bank name', str(banking.bankName)],
                ['Branch', str(banking.branchName)],
                ['Account holder', str(banking.accountHolder)],
                ['Account number', str(banking.accountNumber)],
                ['SWIFT code', str(banking.swiftCode)],
                ['Mobile wallet', str(banking.mobileWallet)],
                ['Wallet number', str(banking.mobileWalletNumber)],
              ]} />
            </>
          )}

          {tab === 'Employment' && (
            <>
              {employee.contractStatus === 'Expiring' && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Contract expiring within 30 days</div>
              )}
              {employee.contractStatus === 'Expired' && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Contract has expired — renewal needed</div>
              )}
              <Section title="Employment Details" rows={[
                ['Employee ID', employee.employeeNumber],
                ['Branch', str(employment.branch)],
                ['Department', str(employee.department)],
                ['Position', employee.position],
                ['Job title', str(employment.jobTitle, employee.position)],
                ['Category', str(employee.category)],
                ['Employment type', employee.contractType],
                ['Employment status', employee.status],
                ['Supervisor / manager', str(employment.supervisor)],
                ['Date hired', formatDate(employee.hireDate)],
                ['Probation end', formatDate(employment.probationEndDate)],
                ['Contract end', employee.ongoingContract ? 'Ongoing' : formatDate(employee.contractEnd)],
                ['Years of service', String(employee.yearsOfService)],
              ]} />
            </>
          )}

          {tab === 'Education' && (
            <>
              <Section title="Education & Qualifications" rows={[
                ['Highest education level', str(education.educationLevel)],
                ['Institution', str(education.institution)],
                ['Graduation year', str(education.graduationYear)],
                ['Professional certifications', str(education.certifications)],
                ['Skills', str(education.skills)],
              ]} />
              <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-navy">Languages Spoken</h3>
                <div className="mt-3">
                  <ChipList items={Array.isArray(education.languages) ? (education.languages as string[]) : []} />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-navy">Recorded Qualifications</h3>
                {(employee.qualifications ?? []).length === 0 ? (
                  <p className="text-muted">No formal qualification records. Education details above are from the registration profile.</p>
                ) : (
                  employee.qualifications!.map((q) => (
                    <div key={q.id} className="rounded-2xl border border-border bg-white p-4">
                      <span className="badge bg-amber-100 text-amber-800">{q.level}</span>
                      <p className="mt-2 font-medium">{q.institution ?? 'Unknown institution'}</p>
                      <p className="text-sm text-muted">{q.field} · {q.year} · Grade: {q.grade ?? '—'}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'Salary' && (
            <>
              <Section title="Salary Information" rows={[
                ['Basic salary', formatMoney(employee.basicSalary, currency)],
                ['Net salary', formatMoney(employee.netSalary, currency)],
                ['Currency', currency],
                ['Payment frequency', str(salary.paymentFrequency)],
              ]} />
              <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-navy">Benefits</h3>
                <div className="mt-3">
                  <ChipList items={Array.isArray(salary.benefits) ? (salary.benefits as string[]) : []} />
                </div>
              </div>
            </>
          )}

          {tab === 'Next of Kin' && (
            <>
              <Section title="Primary Next of Kin" rows={[
                ['Full name', str(nextOfKin.name)],
                ['Relationship', str(nextOfKin.relation)],
                ['Phone', str(nextOfKin.phone)],
                ['Alternative phone', str(nextOfKin.altPhone)],
                ['Email', str(nextOfKin.email)],
                ['Occupation', str(nextOfKin.occupation)],
                ['Address', str(nextOfKin.address)],
                ['Country', str(nextOfKin.country)],
                ['City / district', str(nextOfKin.city)],
              ]} />
              <Section title="Secondary Next of Kin" rows={[
                ['Full name', str(secondaryKin.name, 'Not provided')],
                ['Relationship', str(secondaryKin.relation)],
                ['Phone', str(secondaryKin.phone)],
                ['Alternative phone', str(secondaryKin.altPhone)],
                ['Email', str(secondaryKin.email)],
                ['Occupation', str(secondaryKin.occupation)],
                ['Address', str(secondaryKin.address)],
                ['Country', str(secondaryKin.country)],
                ['City / district', str(secondaryKin.city)],
              ]} />
            </>
          )}

          {tab === 'Documents' && (
            <DocumentsPanel
              employeeId={employeeId}
              documents={employee.documents ?? []}
              onUploaded={reload}
            />
          )}

          {tab === 'System Access' && (
            <>
              <Section title="Portal Access" rows={[
                ['Status', systemAccess.enabled ? 'Enabled' : 'Disabled'],
                ['Login email', str(systemAccess.loginEmail, str(employee.email))],
                ['Assigned role', str(systemAccess.assignedRole)],
                ['Permissions', formatList(systemAccess.assignedPermissions)],
              ]} />
              <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-navy">Employee Tags</h3>
                <div className="mt-3">
                  <ChipList items={employeeTags} />
                </div>
              </div>
              <Section title="HR Notes" rows={[
                ['Internal comments', str(profile.hrNotes, 'None')],
                ['Recruitment source', str(profile.recruitmentSource)],
              ]} />
            </>
          )}

          {tab === 'Leave' && (
            <div className="rounded-2xl border border-border bg-white p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold text-navy">21</p><p className="text-xs text-muted">Annual entitlement</p></div>
                <div><p className="text-2xl font-bold text-navy">0</p><p className="text-xs text-muted">Used</p></div>
                <div><p className="text-2xl font-bold text-navy">21</p><p className="text-xs text-muted">Remaining</p></div>
              </div>
              <Link href={`/leave?staff=${employeeId}`} className="btn-primary mt-4"><Calendar size={16} /> Register leave</Link>
            </div>
          )}

          {tab === 'More' && (
            <Section title="Audit & System Information" rows={[
              ['Employee UID', employee.id],
              ['Portal active', systemAccess.enabled ? 'Yes' : 'No'],
              ['Created date', '—'],
              ['Last updated', '—'],
            ]} />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <h3 className="font-semibold text-navy">Employment Summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p><span className="text-muted">Type:</span> {employee.contractType}</p>
              <p><span className="text-muted">Years:</span> {employee.yearsOfService}</p>
              <p><span className="text-muted">Contract:</span> <StatusBadge status={employee.contractStatus} /></p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <h3 className="font-semibold text-navy">Quick Actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/directory/${employeeId}/edit`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-navy hover:bg-slate-100">
                <Edit size={14} /> Edit profile
              </Link>
              <Link href={`/leave?staff=${employeeId}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-navy hover:bg-slate-100">
                <Calendar size={14} /> Assign leave
              </Link>
              <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-navy hover:bg-slate-100">
                <Download size={14} /> Print ID card
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Profile Sections</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { icon: User, label: 'Personal', tab: 'Personal' as Tab },
                { icon: Phone, label: 'Contact', tab: 'Contact' as Tab },
                { icon: CreditCard, label: 'ID & Bank', tab: 'Identification' as Tab },
                { icon: Briefcase, label: 'Employment', tab: 'Employment' as Tab },
                { icon: GraduationCap, label: 'Education', tab: 'Education' as Tab },
                { icon: Heart, label: 'Next of Kin', tab: 'Next of Kin' as Tab },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.tab} type="button" onClick={() => setTab(item.tab)} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2 text-left hover:bg-slate-100">
                    <Icon size={14} className="text-[#FCB038]" /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

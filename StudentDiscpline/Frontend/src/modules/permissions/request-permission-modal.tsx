'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Ticket,
} from 'lucide-react';
import { DisciplineModal, FormField } from '@/components/discipline-modal';
import { AvatarInitials } from '@/components/discipline-data-table';
import { StudentScanPicker } from '@/components/student-scan-picker';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { SmClass, SmParent, SmStudent } from '@/types/discipline';
import {
  DESTINATION_PRESETS,
  LEAVING_WITH_OPTIONS,
  PERMISSION_TYPES,
  REQUESTED_BY_OPTIONS,
  calcDurationMinutes,
  formatDuration,
  formatPermissionDate,
  formatTime12h,
} from '@/modules/permissions/permission-utils';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

interface RequestPermissionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function RequestPermissionModal({ open, onClose, onSaved }: RequestPermissionModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { academicYear, setAcademicYear, term, settings: academicSettings } = useAcademicSettings();

  const yearOptions = academicSettings?.academicYears?.length
    ? academicSettings.academicYears
    : [academicYear];

  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<SmClass[]>([]);
  const [students, setStudents] = useState<SmStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [classId, setClassId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<SmStudent | null>(null);
  const [primaryParent, setPrimaryParent] = useState<SmParent | null>(null);

  const [permissionType, setPermissionType] = useState('');
  const [customType, setCustomType] = useState('');
  const [reason, setReason] = useState('');
  const [departureDate, setDepartureDate] = useState(today());
  const [departureTime, setDepartureTime] = useState('09:00');
  const [expectedReturnDate, setExpectedReturnDate] = useState(today());
  const [expectedReturnTime, setExpectedReturnTime] = useState('13:00');
  const [leavingWith, setLeavingWith] = useState('Parent / Guardian');
  const [authorizedPersonName, setAuthorizedPersonName] = useState('');
  const [authorizedPersonRelationship, setAuthorizedPersonRelationship] = useState('');
  const [authorizedPersonPhone, setAuthorizedPersonPhone] = useState('');
  const [authorizedPersonId, setAuthorizedPersonId] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [requestedBy, setRequestedBy] = useState('Teacher');
  const [requestedByName, setRequestedByName] = useState('');

  const durationMinutes = useMemo(
    () => calcDurationMinutes(departureDate, departureTime, expectedReturnDate, expectedReturnTime),
    [departureDate, departureTime, expectedReturnDate, expectedReturnTime]
  );

  const reset = useCallback(() => {
    setStep(1);
    setClassId('');
    setStudentSearch('');
    setSelectedStudent(null);
    setPrimaryParent(null);
    setPermissionType('');
    setCustomType('');
    setReason('');
    setDepartureDate(today());
    setDepartureTime('09:00');
    setExpectedReturnDate(today());
    setExpectedReturnTime('13:00');
    setLeavingWith('Parent / Guardian');
    setAuthorizedPersonName('');
    setAuthorizedPersonRelationship('');
    setAuthorizedPersonPhone('');
    setAuthorizedPersonId('');
    setDestination('');
    setDestinationAddress('');
    setRequestedBy('Teacher');
    setRequestedByName(user?.email?.split('@')[0] ?? '');
    setStudents([]);
  }, [user?.email]);

  useEffect(() => {
    if (!open) return;
    reset();
    void (async () => {
      try {
        const { data } = await disciplineApi.classes();
        setClasses(data.data ?? []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load classes'));
      }
    })();
  }, [open, reset]);

  useEffect(() => {
    if (!open || step !== 1) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await disciplineApi.students({
          classId: classId || undefined,
          search: studentSearch || undefined,
          academicYear,
        });
        setStudents(data.data ?? []);
      } catch {
        setStudents([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [open, step, classId, studentSearch, academicYear]);

  async function selectStudent(student: SmStudent) {
    setSelectedStudent(student);
    setStudentSearch('');
    setStudents([]);
    try {
      const { data } = await disciplineApi.studentParents(student.id);
      const list = data.data ?? [];
      setPrimaryParent(list[0] ?? null);
    } catch {
      setPrimaryParent(null);
    }
  }

  async function lookupStudentByCode(code: string) {
    setSearching(true);
    try {
      const { data } = await disciplineApi.students({ search: code, academicYear });
      const list = data.data ?? [];
      const exact =
        list.find((s) => s.studentCode?.toLowerCase() === code.toLowerCase()) ??
        list.find((s) => s.id === code) ??
        list[0];
      if (!exact) {
        toast.error('No student found for that code');
        return;
      }
      await selectStudent(exact);
      toast.success(`Student ${exact.fullName} selected`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Student lookup failed'));
    } finally {
      setSearching(false);
    }
  }

  function canProceed() {
    if (step === 1) return Boolean(selectedStudent);
    if (step === 2) {
      if (!permissionType) return false;
      if (permissionType === 'Other' && !customType.trim()) return false;
      if (!reason.trim()) return false;
      if (durationMinutes <= 0) return false;
      if (leavingWith === 'Authorized Person') {
        return Boolean(authorizedPersonName.trim() && authorizedPersonPhone.trim());
      }
      return true;
    }
    if (step === 3) return Boolean(destination.trim()) && Boolean(requestedBy);
    return true;
  }

  async function submit() {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const guardianLink = primaryParent?.students?.find((s) => s.studentId === selectedStudent.id);
      const { data } = await disciplineApi.createPermission({
        studentId: selectedStudent.id,
        studentCode: selectedStudent.studentCode,
        studentName: selectedStudent.fullName,
        className: selectedStudent.className ?? classes.find((c) => c.id === classId)?.label ?? '',
        classId: selectedStudent.classId ?? (classId || undefined),
        academicYear,
        term,
        permissionType,
        customType: permissionType === 'Other' ? customType.trim() : undefined,
        reason: reason.trim(),
        destination: destination.trim(),
        destinationAddress: destinationAddress.trim() || undefined,
        departureDate,
        departureTime,
        expectedReturnDate,
        expectedReturnTime,
        leavingWith,
        guardianName: leavingWith === 'Parent / Guardian' ? primaryParent?.fullName : undefined,
        guardianRelationship: leavingWith === 'Parent / Guardian' ? (guardianLink?.role ?? primaryParent?.role) : undefined,
        guardianPhone: leavingWith === 'Parent / Guardian' ? (primaryParent?.phone ?? undefined) : undefined,
        authorizedPersonName: leavingWith === 'Authorized Person' ? authorizedPersonName.trim() : undefined,
        authorizedPersonRelationship:
          leavingWith === 'Authorized Person' ? authorizedPersonRelationship.trim() || undefined : undefined,
        authorizedPersonPhone: leavingWith === 'Authorized Person' ? authorizedPersonPhone.trim() : undefined,
        authorizedPersonId: leavingWith === 'Authorized Person' ? authorizedPersonId.trim() || undefined : undefined,
        requestedBy,
        requestedByName: requestedByName.trim() || undefined,
      });
      const created = data.data;
      toast.success(`Permission submitted — ${created.scanCode ?? created.referenceNumber}`);
      onClose();
      onSaved();
      if (created.id) router.push(`/permissions/${created.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to submit permission request'));
    } finally {
      setSaving(false);
    }
  }

  const stepTitles = ['Select Student', 'Permission Details', 'Destination', 'Review'];

  return (
    <DisciplineModal
      open={open}
      onClose={onClose}
      title="Request Permission"
      subtitle={`Step ${step} of 4 — ${stepTitles[step - 1]}`}
      icon={<Ticket size={18} />}
      size="xl"
      footer={
        <>
          {step > 1 ? (
            <button type="button" className="btn-secondary mr-auto" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={16} className="inline" /> Back
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          )}
          {step < 4 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
            >
              Next <ChevronRight size={16} className="inline" />
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void submit()}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          )}
        </>
      }
    >
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition ${n <= step ? 'bg-[#fcb038]' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          {!selectedStudent ? (
            <div className="rounded-2xl border border-[#fcb038]/25 bg-[#fcb038]/5 p-4">
              <p className="mb-3 text-sm font-semibold text-[#000435]">Scan student Smart Card or enter code</p>
              <StudentScanPicker
                disabled={searching}
                onCodeResolved={(code) => void lookupStudentByCode(code)}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Academic Year">
              <select className="discipline-input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Class">
              <select className="discipline-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Search Student">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="discipline-input pl-9"
                  placeholder="Search by name or code…"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
            </FormField>
          </div>

          {!selectedStudent ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Class</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {searching ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Searching…</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Search or select a class to find students</td></tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-[#000435]">{s.fullName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.studentCode}</td>
                        <td className="px-4 py-3">{s.className ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" className="btn-secondary py-1 text-xs" onClick={() => void selectStudent(s)}>
                            Select
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
              <div className="flex flex-wrap items-start gap-4">
                <AvatarInitials name={selectedStudent.fullName} seed={selectedStudent.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-[#000435]">{selectedStudent.fullName}</p>
                  <p className="font-mono text-sm text-slate-500">{selectedStudent.studentCode}</p>
                  <p className="text-sm text-slate-600">{selectedStudent.className ?? '—'}</p>
                  <p className="mt-2 text-xs text-slate-500">Status: {selectedStudent.status ?? 'Active'}</p>
                  {primaryParent ? (
                    <div className="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                      <p className="text-xs uppercase text-slate-400">Parent / Guardian</p>
                      <p className="font-medium text-[#000435]">{primaryParent.fullName}</p>
                      {primaryParent.phone ? <p className="text-xs text-slate-500">{primaryParent.phone}</p> : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => { setSelectedStudent(null); setPrimaryParent(null); }}
                >
                  Change student
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          {selectedStudent ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <AvatarInitials name={selectedStudent.fullName} seed={selectedStudent.id} />
              <div>
                <p className="font-semibold text-[#000435]">{selectedStudent.fullName}</p>
                <p className="text-xs text-slate-500">{selectedStudent.studentCode} · {selectedStudent.className}</p>
              </div>
            </div>
          ) : null}

          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Permission Type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PERMISSION_TYPES.map((t) => {
                const selected = permissionType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPermissionType(t.id)}
                    className={`group relative overflow-hidden rounded-xl border px-3 py-3.5 text-left transition ${
                      selected
                        ? 'border-[#000435] bg-[#000435] text-white shadow-lg ring-2 ring-[#fcb038]/40'
                        : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm ${t.bg}`
                    }`}
                  >
                    <span className={`mb-2 inline-block h-1.5 w-8 rounded-full ${selected ? 'bg-[#fcb038]' : t.dot}`} />
                    <p className={`text-sm font-semibold ${selected ? 'text-white' : t.text}`}>{t.label}</p>
                  </button>
                );
              })}
            </div>
            {permissionType === 'Other' ? (
              <div className="mt-3">
                <FormField label="Custom Type" required>
                  <input className="discipline-input" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Describe permission type" />
                </FormField>
              </div>
            ) : null}
          </section>

          <FormField label="Reason" required>
            <textarea
              className="discipline-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the student needs permission…"
            />
          </FormField>

          <section className="rounded-xl border border-slate-200 p-4">
            <p className="mb-4 text-sm font-semibold text-[#000435]">Departure & Return</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Leaving School</p>
                <FormField label="Departure Date">
                  <input className="discipline-input" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </FormField>
                <FormField label="Expected Departure Time">
                  <input className="discipline-input" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                </FormField>
              </div>
              <div className="space-y-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Returning to School</p>
                <FormField label="Expected Return Date">
                  <input className="discipline-input" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
                </FormField>
                <FormField label="Expected Return Time">
                  <input className="discipline-input" type="time" value={expectedReturnTime} onChange={(e) => setExpectedReturnTime(e.target.value)} />
                </FormField>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#000435]/5 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Expected Duration</span>
              <span className="text-lg font-bold text-[#000435]">{formatDuration(durationMinutes)}</span>
            </div>
            {durationMinutes <= 0 ? (
              <p className="mt-2 text-xs text-red-600">Return time must be after departure time.</p>
            ) : null}
          </section>

          <section>
            <FormField label="Leaving With">
              <select className="discipline-input" value={leavingWith} onChange={(e) => setLeavingWith(e.target.value)}>
                {LEAVING_WITH_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </FormField>

            {leavingWith === 'Parent / Guardian' && primaryParent ? (
              <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Guardian</p>
                  <p className="font-medium">{primaryParent.fullName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Relationship</p>
                  <p className="font-medium">{primaryParent.students?.[0]?.role ?? primaryParent.role ?? 'Guardian'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Phone</p>
                  <p className="font-medium">{primaryParent.phone ?? '—'}</p>
                </div>
              </div>
            ) : null}

            {leavingWith === 'Authorized Person' ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Full Name" required>
                  <input className="discipline-input" value={authorizedPersonName} onChange={(e) => setAuthorizedPersonName(e.target.value)} />
                </FormField>
                <FormField label="Relationship">
                  <input className="discipline-input" value={authorizedPersonRelationship} onChange={(e) => setAuthorizedPersonRelationship(e.target.value)} placeholder="Uncle" />
                </FormField>
                <FormField label="Phone Number" required>
                  <input className="discipline-input" value={authorizedPersonPhone} onChange={(e) => setAuthorizedPersonPhone(e.target.value)} />
                </FormField>
                <FormField label="ID / Document Number">
                  <input className="discipline-input" value={authorizedPersonId} onChange={(e) => setAuthorizedPersonId(e.target.value)} />
                </FormField>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <p className="text-sm font-semibold text-[#000435]">Where is the student going?</p>
            <p className="mt-1 text-xs text-slate-500">Specify the place or event the student will attend during this permission.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {DESTINATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDestination(preset === 'Other location' ? '' : preset)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    destination === preset
                      ? 'border-[#000435] bg-[#000435] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Destination / Place" required hint="e.g. King Faisal Hospital, home, sports venue">
                <input
                  className="discipline-input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Where the student is going"
                />
              </FormField>
              <FormField label="Address or details" hint="Optional — street, district, contact">
                <input
                  className="discipline-input"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Full address or location notes"
                />
              </FormField>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Requested By">
              <select className="discipline-input" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)}>
                {REQUESTED_BY_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Requester Name">
              <input
                className="discipline-input"
                value={requestedByName}
                onChange={(e) => setRequestedByName(e.target.value)}
                placeholder="Name of person requesting"
              />
            </FormField>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
            A unique permission code and QR code will be generated automatically when you submit this request. Gate officers can scan it at checkout.
          </div>
        </div>
      ) : null}

      {step === 4 && selectedStudent ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#000435]">Permission Summary</h3>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50">
            {[
              ['Student', `${selectedStudent.fullName} — ${selectedStudent.className ?? '—'}`],
              ['Permission', permissionType === 'Other' ? customType : permissionType],
              ['Reason', reason],
              ['Destination', destinationAddress.trim() ? `${destination} — ${destinationAddress}` : destination],
              ['Departure', `${formatPermissionDate(departureDate)} — ${formatTime12h(departureTime)}`],
              ['Expected Return', `${formatPermissionDate(expectedReturnDate)} — ${formatTime12h(expectedReturnTime)}`],
              ['Duration', formatDuration(durationMinutes)],
              [
                'Leaving With',
                leavingWith === 'Parent / Guardian' && primaryParent
                  ? `Parent — ${primaryParent.fullName}`
                  : leavingWith === 'Authorized Person'
                    ? `${authorizedPersonName} (${authorizedPersonRelationship || 'Authorized'})`
                    : leavingWith,
              ],
              ['Requested By', requestedByName.trim() ? `${requestedBy} — ${requestedByName}` : requestedBy],
              ['Permission Code', 'Auto-generated on submit (PRC-XXXXXXXX)'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="max-w-[65%] text-right font-medium text-[#000435]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </DisciplineModal>
  );
}

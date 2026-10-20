'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { DisciplineModal, FormField } from '@/components/discipline-modal';
import { AvatarInitials } from '@/components/discipline-data-table';
import { StudentScanPicker } from '@/components/student-scan-picker';
import { useAuth } from '@/contexts/auth-context';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DisciplineMark, DisciplineOrgSettings, SmClass, SmParent, SmStudent, StudentDisciplineProfile } from '@/types/discipline';
import { canAdjustDisciplineMarks, scoreLabel, signedMarkPoints } from '@/types/discipline';
import { toast } from 'sonner';

const LOCATIONS = ['Classroom', 'School compound', 'Dormitory', 'Playground', 'Laboratory', 'Other'];
const ACTIONS = [
  'Verbal Warning',
  'Written Warning',
  'Parent Notification',
  'Counseling',
  'Detention',
  'Community Service',
  'Suspension',
  'Other',
];

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

interface RegisterCaseModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function RegisterCaseModal({ open, onClose, onSaved }: RegisterCaseModalProps) {
  const { user } = useAuth();
  const { academicYear, setAcademicYear, settings: academicSettings } = useAcademicSettings();
  const canAdjust = canAdjustDisciplineMarks(user?.roles);

  const yearOptions = academicSettings?.academicYears?.length
    ? academicSettings.academicYears
    : [academicYear];

  const [classes, setClasses] = useState<SmClass[]>([]);
  const [marks, setMarks] = useState<DisciplineMark[]>([]);
  const [students, setStudents] = useState<SmStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [classId, setClassId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<SmStudent | null>(null);
  const [profile, setProfile] = useState<StudentDisciplineProfile | null>(null);
  const [parents, setParents] = useState<SmParent[]>([]);

  const [markId, setMarkId] = useState('');
  const [useCustomCase, setUseCustomCase] = useState(false);
  const [customCaseName, setCustomCaseName] = useState('');
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [defaultPoints, setDefaultPoints] = useState(0);

  const [incidentDate, setIncidentDate] = useState(today());
  const [incidentTime, setIncidentTime] = useState(nowTime());
  const [location, setLocation] = useState('Classroom');
  const [description, setDescription] = useState('');
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [actionNotes, setActionNotes] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyWebPush, setNotifyWebPush] = useState(true);
  const [orgSettings, setOrgSettings] = useState<Pick<DisciplineOrgSettings, 'defaultMaxScore' | 'defaultStartingScore'>>({
    defaultMaxScore: 100,
    defaultStartingScore: 100,
  });

  const selectedMark = useMemo(() => marks.find((m) => m.id === markId) ?? null, [marks, markId]);
  const activeMarks = useMemo(() => marks.filter((m) => m.status === 'Active'), [marks]);

  const maxScore = profile?.maxScore ?? orgSettings.defaultMaxScore;
  const scoreBefore = profile?.currentScore ?? orgSettings.defaultStartingScore;
  const scoreAfter = Math.max(0, Math.min(maxScore, scoreBefore + appliedPoints));
  const exceedsAvailable = appliedPoints < 0 && scoreBefore + appliedPoints < 0;

  const reset = useCallback(() => {
    setClassId('');
    setStudentSearch('');
    setSelectedStudent(null);
    setProfile(null);
    setParents([]);
    setMarkId('');
    setUseCustomCase(false);
    setCustomCaseName('');
    setAppliedPoints(0);
    setDefaultPoints(0);
    setIncidentDate(today());
    setIncidentTime(nowTime());
    setLocation('Classroom');
    setDescription('');
    setActionsTaken([]);
    setActionNotes('');
    setNotifyParent(true);
    setNotifySms(true);
    setNotifyEmail(true);
    setNotifyInApp(true);
    setNotifyWebPush(true);
    setStudents([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    void (async () => {
      try {
        const [classRes, marksRes, settingsRes] = await Promise.all([
          disciplineApi.classes(),
          disciplineApi.marks({ status: 'Active' }),
          disciplineApi.disciplineSettings(),
        ]);
        setClasses(classRes.data.data ?? []);
        setMarks(marksRes.data.data ?? []);
        const s = settingsRes.data.data;
        setOrgSettings({
          defaultMaxScore: s.defaultMaxScore,
          defaultStartingScore: s.defaultStartingScore,
        });
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load form data'));
      }
    })();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, classId, studentSearch, academicYear]);

  async function selectStudent(student: SmStudent) {
    setSelectedStudent(student);
    setStudentSearch('');
    setStudents([]);
    try {
      const [profileRes, parentsRes] = await Promise.all([
        disciplineApi.studentProfile(student.id),
        disciplineApi.studentParents(student.id),
      ]);
      setProfile(profileRes.data.data);
      setParents(parentsRes.data.data ?? []);
    } catch {
      setProfile({
        studentId: student.id,
        currentScore: orgSettings.defaultStartingScore,
        maxScore: orgSettings.defaultMaxScore,
        totalCases: 0,
        casesThisTerm: 0,
        initialized: false,
      });
      setParents([]);
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

  function selectMark(id: string) {
    setMarkId(id);
    setUseCustomCase(false);
    const mark = marks.find((m) => m.id === id);
    if (mark) {
      const signed = signedMarkPoints(mark.type, mark.points);
      setDefaultPoints(signed);
      setAppliedPoints(signed);
    }
  }

  function selectCustomCase() {
    setUseCustomCase(true);
    setMarkId('');
    setDefaultPoints(-2);
    setAppliedPoints(-2);
  }

  function adjustPoints(delta: number) {
    if (!canAdjust) return;
    setAppliedPoints((p) => {
      const mark = selectedMark;
      const base = mark ? signedMarkPoints(mark.type, mark.points) : defaultPoints;
      const next = (p || base) + delta;
      if (mark?.type === 'REWARD') return Math.max(1, next);
      if (mark?.type === 'DEDUCTION') return Math.min(-1, next);
      return next;
    });
  }

  async function save() {
    if (!selectedStudent) {
      toast.error('Select a student first');
      return;
    }
    if (!useCustomCase && !markId) {
      toast.error('Select a case type');
      return;
    }
    if (useCustomCase && !customCaseName.trim()) {
      toast.error('Enter a custom case name');
      return;
    }
    if (exceedsAvailable) {
      toast.error('Deduction exceeds available discipline points');
      return;
    }

    setSaving(true);
    try {
      const notifyMethods: string[] = [];
      if (notifySms) notifyMethods.push('SMS');
      if (notifyEmail) notifyMethods.push('Email');
      if (notifyInApp) notifyMethods.push('InApp');
      if (notifyWebPush) notifyMethods.push('WebPush');

      await disciplineApi.createCase({
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentCode: selectedStudent.studentCode,
        className: selectedStudent.className ?? classes.find((c) => c.id === classId)?.label ?? '',
        classId: selectedStudent.classId ?? (classId || undefined),
        academicYear,
        markId: useCustomCase ? undefined : markId,
        customCaseName: useCustomCase ? customCaseName.trim() : undefined,
        incidentDate,
        incidentTime,
        location,
        description: description || undefined,
        appliedPoints: canAdjust ? appliedPoints : undefined,
        actionsTaken,
        actionNotes: actionNotes || undefined,
        notifyParent,
        notifyMethods: notifyParent ? notifyMethods : [],
        status: 'Open',
      });
      toast.success('Discipline case registered');
      onClose();
      onSaved();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to register case'));
    } finally {
      setSaving(false);
    }
  }

  const caseName = useCustomCase ? customCaseName || 'Other' : selectedMark?.name ?? '';

  return (
    <DisciplineModal
      open={open}
      onClose={onClose}
      title="Register Discipline Case"
      subtitle="Find student, select case type, and record the incident"
      icon={<ShieldAlert size={18} />}
      size="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={saving || !selectedStudent} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Register Case'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {!selectedStudent ? (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000435]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#000435] text-xs text-white">1</span>
              Find Student
            </h3>
            <div className="mb-4 rounded-2xl border border-[#fcb038]/25 bg-[#fcb038]/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Scan Smart Card QR or enter code</p>
              <StudentScanPicker disabled={searching} onCodeResolved={(code) => void lookupStudentByCode(code)} />
            </div>
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

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Class</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {searching ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Searching…</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Search or select a class to find students</td></tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{s.fullName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.studentCode}</td>
                        <td className="px-4 py-3">{s.className ?? '—'}</td>
                        <td className="px-4 py-3">{s.status ?? 'Active'}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" className="btn-secondary py-1 text-xs" onClick={() => void selectStudent(s)}>
                            Select <ChevronRight size={14} className="inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-start gap-3">
                <AvatarInitials name={selectedStudent.fullName} seed={selectedStudent.id} />
                <div>
                  <p className="text-lg font-bold text-[#000435]">{selectedStudent.fullName}</p>
                  <p className="font-mono text-sm text-slate-500">{selectedStudent.studentCode}</p>
                  <p className="text-sm text-slate-600">
                    {selectedStudent.className ?? '—'}{selectedStudent.gender ? ` • ${selectedStudent.gender}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase text-slate-500">Current Discipline Score</p>
                <p className="text-3xl font-bold text-[#000435]">{scoreBefore} <span className="text-lg text-slate-400">/ {maxScore}</span></p>
                <p className="text-xs font-medium text-emerald-600">{scoreLabel(scoreBefore, maxScore)}</p>
              </div>
              <div className="flex gap-4 text-center text-sm">
                <div><p className="font-bold">{profile?.totalCases ?? 0}</p><p className="text-xs text-slate-500">Cases</p></div>
                <div><p className="font-bold">{profile?.casesThisTerm ?? 0}</p><p className="text-xs text-slate-500">This Term</p></div>
              </div>
              <button type="button" className="btn-secondary text-xs" onClick={() => { setSelectedStudent(null); setProfile(null); setParents([]); }}>
                Change student
              </button>
            </div>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000435]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#000435] text-xs text-white">2</span>
                Case Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Case Type">
                  <select
                    className="discipline-input"
                    value={useCustomCase ? '__other__' : markId}
                    onChange={(e) => {
                      if (e.target.value === '__other__') selectCustomCase();
                      else selectMark(e.target.value);
                    }}
                  >
                    <option value="">Select case type…</option>
                    {activeMarks.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    <option value="__other__">+ Other (custom case)</option>
                  </select>
                </FormField>
                {useCustomCase ? (
                  <FormField label="Custom Case Name" required>
                    <input className="discipline-input" value={customCaseName} onChange={(e) => setCustomCaseName(e.target.value)} placeholder="Using phone during examination" />
                  </FormField>
                ) : null}
                <FormField label="Incident Date">
                  <input className="discipline-input" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
                </FormField>
                <FormField label="Incident Time">
                  <input className="discipline-input" type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} />
                </FormField>
                <FormField label="Location">
                  <select className="discipline-input" value={location} onChange={(e) => setLocation(e.target.value)}>
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="mt-4">
                <FormField label="Description">
                  <textarea className="discipline-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened…" />
                </FormField>
              </div>
            </section>

            {(markId || useCustomCase) ? (
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#000435]">Discipline Marks</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Default Mark</p>
                    <p className="text-xl font-bold text-slate-700">{defaultPoints > 0 ? `+${defaultPoints}` : defaultPoints}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Applied Mark</p>
                    <div className="mt-1 flex items-center gap-2">
                      {canAdjust ? (
                        <>
                          <button type="button" className="rounded-lg border p-2 hover:bg-slate-50" onClick={() => adjustPoints(-1)}><Minus size={14} /></button>
                          <span className="min-w-[3rem] text-center text-xl font-bold">{appliedPoints > 0 ? `+${appliedPoints}` : appliedPoints}</span>
                          <button type="button" className="rounded-lg border p-2 hover:bg-slate-50" onClick={() => adjustPoints(1)}><Plus size={14} /></button>
                        </>
                      ) : (
                        <span className="text-xl font-bold">{appliedPoints > 0 ? `+${appliedPoints}` : appliedPoints}</span>
                      )}
                    </div>
                    {!canAdjust ? <p className="mt-1 text-[11px] text-slate-400">Only discipline admins can adjust marks</p> : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Score Impact</p>
                    <div className="mt-1 space-y-1 text-sm">
                      <div className="flex justify-between"><span>Current</span><span className="font-semibold">{scoreBefore}</span></div>
                      <div className="flex justify-between text-red-600"><span>Case</span><span>{appliedPoints > 0 ? `+${appliedPoints}` : appliedPoints}</span></div>
                      <div className="flex justify-between border-t pt-1 font-bold"><span>Remaining</span><span>{scoreAfter} / {maxScore}</span></div>
                    </div>
                  </div>
                </div>
                {exceedsAvailable ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>This deduction exceeds the student&apos;s available discipline points. Score will be clamped to 0.</p>
                  </div>
                ) : null}
                {caseName ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {selectedMark?.type === 'REWARD' ? 'Reward' : 'Deduct'} {Math.abs(appliedPoints)} point{Math.abs(appliedPoints) === 1 ? '' : 's'} for &quot;{caseName}&quot;
                  </p>
                ) : null}
              </section>
            ) : null}

            <section>
              <h3 className="mb-3 text-sm font-semibold text-[#000435]">Action Taken</h3>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((a) => (
                  <label key={a} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${actionsTaken.includes(a) ? 'border-[#000435] bg-[#000435] text-white' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={actionsTaken.includes(a)} onChange={() => setActionsTaken((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])} />
                    {a}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <FormField label="Action Notes">
                  <textarea className="discipline-input" rows={2} value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Describe the action taken…" />
                </FormField>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#000435]">Notify Parent/Guardian</p>
                  <p className="text-xs text-slate-500">Send via Notification Service (SMS, email, in-app, web push)</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifyParent}
                  onClick={() => setNotifyParent((v) => !v)}
                  className={`relative h-7 w-12 rounded-full transition ${notifyParent ? 'bg-[#fcb038]' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${notifyParent ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              {parents.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked parents (from Student Management)</p>
                  {parents.map((p) => {
                    const link = p.students?.find((s) => s.studentId === selectedStudent.id);
                    return (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-[#000435]">{p.fullName}</p>
                          <p className="text-xs text-slate-500">{link?.role ?? 'Guardian'}</p>
                        </div>
                        <div className="text-xs text-slate-600">
                          {p.phone ? <span className="mr-3">{p.phone}</span> : null}
                          {p.email ? <span>{p.email}</span> : null}
                          {!p.phone && !p.email ? <span className="text-amber-600">No contact on file</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No parents linked to this student in Student Management. Notifications will be skipped.
                </p>
              )}

              {notifyParent ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notification channels</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} /> SMS
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> Email
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={notifyInApp} onChange={(e) => setNotifyInApp(e.target.checked)} /> In-app notification
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={notifyWebPush} onChange={(e) => setNotifyWebPush(e.target.checked)} /> Web push
                    </label>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    Dear Parent/Guardian, a discipline case ({caseName || 'incident'}) has been recorded for your child {selectedStudent.fullName}. Current score: {scoreAfter}/{maxScore}.
                  </div>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </DisciplineModal>
  );
}

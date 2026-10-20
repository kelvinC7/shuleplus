'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  Crown,
  Loader2,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  fetchMyClassStudents,
  fetchMyClasses,
  myClassesApiError,
  type MyClassItem,
  type MyClassStudent,
} from '@/services/my-classes-api';
import { GateAttendancePanel } from './gate-attendance-panel';
import { DisciplinePanel } from './discipline-panel';
import { ClassAttendancePanel } from './class-attendance-panel';

type ClassTab = 'roster' | 'gate' | 'mark' | 'discipline';

function classLabel(cls: MyClassItem) {
  return cls.label || [cls.name, cls.stream].filter(Boolean).join(' ');
}

function roleBadge(role: 'HEAD' | 'TEACHING') {
  if (role === 'HEAD') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
        <Crown className="h-3 w-3" />
        Head
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
      <BookOpen className="h-3 w-3" />
      Teaching
    </span>
  );
}

function ClassDetailDrawer({
  selectedClass,
  onClose,
  term,
  academicYear,
}: {
  selectedClass: MyClassItem;
  onClose: () => void;
  term: string;
  academicYear: string;
}) {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ClassTab>('roster');
  const [students, setStudents] = useState<MyClassStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [profile, setProfile] = useState<MyClassStudent | null>(null);

  const isHead = selectedClass.roles.includes('HEAD');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setActiveTab('roster');
  }, [selectedClass.id]);

  useEffect(() => {
    if (activeTab !== 'roster') return;
    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const rows = await fetchMyClassStudents(selectedClass.id, classLabel(selectedClass), academicYear);
        if (!cancelled) {
          setStudents(
            [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }))
          );
        }
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass, academicYear, activeTab]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const tabs: Array<{ id: ClassTab; label: string; shortLabel: string; icon: typeof Users; headOnly?: boolean }> = [
    { id: 'roster', label: 'Roster', shortLabel: 'Roster', icon: Users },
    { id: 'gate', label: 'Gate RFID', shortLabel: 'Gate', icon: Radio, headOnly: true },
    { id: 'mark', label: 'Mark Attendance', shortLabel: 'Mark', icon: ClipboardCheck, headOnly: true },
    { id: 'discipline', label: 'Discipline', shortLabel: 'Discipline', icon: ShieldAlert, headOnly: true },
  ];

  function handleClose() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close class details"
        onClick={handleClose}
        className={`absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-drawer-title"
        className={`relative flex h-full w-full max-w-full flex-col bg-white shadow-[-8px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="class-drawer-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {classLabel(selectedClass)}
                </h2>
                {selectedClass.roles.map((role) => (
                  <span key={role}>{roleBadge(role)}</span>
                ))}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {isHead
                  ? 'Head of class — roster, gate RFID, mark attendance, and discipline'
                  : 'Teaching assignment — roster only'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {selectedClass.studentCount ?? 0} students
                </span>
                <span>{selectedClass.category ?? 'Class'}</span>
                {(selectedClass.subjects?.length ?? 0) > 0 && (
                  <span>{selectedClass.subjects!.join(' · ')}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 bg-white px-3 py-2 sm:px-4">
          {tabs.map((tab) => {
            if (tab.headOnly && !isHead) return null;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {!isHead && (
          <div className="mx-4 mt-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            You teach this class but are not <strong>Head of Class</strong>. Gate RFID, Mark Attendance, and Discipline
            tabs appear after an admin assigns you in Student Management → Class Head Teachers.
          </div>
        )}

        <div
          className={`min-h-0 flex-1 bg-slate-50/40 ${
            activeTab === 'mark' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {activeTab === 'roster' && (
            <>
              {studentsLoading ? (
                <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading students…
                </div>
              ) : students.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">No active students in this class.</div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <table className="min-w-full bg-white text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Gender</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, index) => (
                          <tr
                            key={student.id}
                            className="cursor-pointer border-t border-slate-100 hover:bg-sky-50"
                            onClick={() => setProfile(student)}
                          >
                            <td className="px-4 py-2.5 text-slate-500">{student.rollNumber ?? index + 1}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                {student.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={student.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-slate-200" />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FCB038]/15 text-xs font-bold text-[#000435]">
                                    {student.fullName.slice(0, 1)}
                                  </div>
                                )}
                                <span className="font-medium text-slate-900">{student.fullName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">{student.studentCode}</td>
                            <td className="px-4 py-2.5 text-slate-600">{student.gender ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-2 p-3 md:hidden">
                    {students.map((student, index) => (
                      <div
                        key={student.id}
                        className="cursor-pointer rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                        onClick={() => setProfile(student)}
                      >
                        <p className="font-medium text-slate-900">{student.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.studentCode}
                          {student.gender ? ` · ${student.gender}` : ''}
                          {' · #'}
                          {student.rollNumber ?? index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'gate' && isHead && (
            <GateAttendancePanel selectedClass={selectedClass} term={term} academicYear={academicYear} />
          )}

          {activeTab === 'mark' && isHead && term && academicYear && (
            <div className="flex min-h-0 flex-1 flex-col">
              <ClassAttendancePanel selectedClass={selectedClass} term={term} academicYear={academicYear} />
            </div>
          )}

          {activeTab === 'discipline' && isHead && (
            <DisciplinePanel selectedClass={selectedClass} term={term} academicYear={academicYear} />
          )}
        </div>
      </aside>

      {profile && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close student" onClick={() => setProfile(null)} />
          <div className="relative z-10 m-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student profile</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{profile.fullName}</h3>
                <p className="text-sm text-slate-600">{profile.studentCode} · {classLabel(selectedClass)}</p>
              </div>
              <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" onClick={() => setProfile(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-slate-500">Gender</dt><dd className="font-medium">{profile.gender ?? '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Roll</dt><dd className="font-medium">{profile.rollNumber ?? '—'}</dd></div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Parent / guardian</dt>
                <dd className="font-medium">
                  {profile.parentName ?? 'On file in Student Management'}
                  {profile.parentPhone ? (
                    <a href={`tel:${profile.parentPhone}`} className="mt-1 inline-flex items-center gap-1 text-sky-700">
                      <Phone className="h-3.5 w-3.5" /> {profile.parentPhone}
                    </a>
                  ) : (
                    <span className="mt-1 block text-xs text-slate-500">Phone is on the student record in Student Management.</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <a href="/assessments" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Marks</a>
              <a href="/attendance" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Attendance</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MyClassesView() {
  const { term, academicYear } = useAcademicSettings();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMyClasses>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<MyClassItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMyClasses({ term, academicYear }));
    } catch (err) {
      setError(myClassesApiError(err, 'Could not load your classes'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.classes ?? [];
    if (!q) return list;
    return list.filter((cls) => {
      const label = classLabel(cls).toLowerCase();
      const subjects = (cls.subjects ?? []).join(' ').toLowerCase();
      return label.includes(q) || subjects.includes(q);
    });
  }, [data?.classes, search]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your classes…
      </div>
    );
  }

  return (
    <>
      <div className="-mx-4 -my-5 flex min-h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6 sm:-my-8">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600">
              Tap a class to open roster, gate RFID, attendance, and discipline in a side panel.
            </p>
            {data?.teacherName && (
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{data.teacherName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-6">
            {error}
          </div>
        )}

        <div className="grid shrink-0 grid-cols-3 divide-x border-b border-slate-200 bg-white text-center">
          <div className="px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Classes</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">{data?.classes.length ?? 0}</p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Head of</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
              {data?.classes.filter((c) => c.roles.includes('HEAD')).length ?? 0}
            </p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Students</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
              {selectedClass?.studentCount ?? '—'}
            </p>
          </div>
        </div>

        <div className="shrink-0 border-b border-slate-200 p-3 sm:p-4">
          <div className="relative mx-auto max-w-3xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class or subject…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-500 focus:ring-2"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {filtered.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No classes found for your account yet. Ask admin to assign you as head of class or add timetable
              assignments.
            </div>
          ) : (
            <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900 group-hover:text-sky-900">
                        {classLabel(cls)}
                      </p>
                      <p className="text-xs text-slate-500">{cls.category ?? 'Class'}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      <Users className="h-3.5 w-3.5" />
                      {cls.studentCount ?? 0}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {cls.roles.map((role) => (
                      <span key={role}>{roleBadge(role)}</span>
                    ))}
                  </div>
                  {(cls.subjects?.length ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-slate-600">{cls.subjects!.join(' · ')}</p>
                  )}
                  <p className="mt-3 text-xs font-medium text-sky-600 opacity-0 transition group-hover:opacity-100">
                    Open class panel →
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClass && (
        <ClassDetailDrawer
          selectedClass={selectedClass}
          onClose={() => setSelectedClass(null)}
          term={term}
          academicYear={academicYear}
        />
      )}
    </>
  );
}

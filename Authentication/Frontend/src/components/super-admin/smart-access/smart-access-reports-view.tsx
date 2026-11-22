'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  CreditCard,
  Download,
  GraduationCap,
  LayoutGrid,
  List,
  Loader2,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SmartAccessSchoolToolbar,
  SchoolListEmptyState,
  SchoolListItem,
  type SchoolFilterValues,
} from '@/components/super-admin/smart-access/smart-access-school-toolbar';
import { SmartAccessTabs } from '@/components/super-admin/smart-access/smart-access-tabs';
import { SchoolLogo } from '@/components/super-admin/smart-access/school-logo';
import {
  fetchSmartAccessClasses,
  fetchSmartAccessSchools,
  fetchSmartAccessStudents,
  type SmartAccessClass,
  type SmartAccessSchool,
  type SmartAccessStudent,
} from '@/lib/smart-access-api';

const EMPTY_FILTERS: SchoolFilterValues = {
  provinceId: '',
  districtId: '',
  sectorId: '',
  search: '',
};

type CardFilter = 'all' | 'assigned' | 'unassigned';
type ReportView = 'dashboard' | 'table';

type ClassCardBucket = {
  id: string;
  label: string;
  students: SmartAccessStudent[];
  assigned: number;
  total: number;
  pct: number;
};

function resolveClassKey(s: SmartAccessStudent, classes: SmartAccessClass[]): { id: string; label: string } {
  const cn = s.className?.trim();
  if (!cn) return { id: '__none__', label: 'Unassigned class' };
  const match = classes.find((c) => (c.label ?? c.name) === cn || c.name === cn);
  if (match) return { id: match.id, label: match.label ?? match.name };
  return { id: `name:${cn}`, label: cn };
}

function buildClassBuckets(students: SmartAccessStudent[], classes: SmartAccessClass[]): ClassCardBucket[] {
  const map = new Map<string, ClassCardBucket>();
  for (const c of classes) {
    map.set(c.id, { id: c.id, label: c.label ?? c.name, students: [], assigned: 0, total: 0, pct: 0 });
  }
  for (const s of students) {
    const { id, label } = resolveClassKey(s, classes);
    if (!map.has(id)) {
      map.set(id, { id, label, students: [], assigned: 0, total: 0, pct: 0 });
    }
    const bucket = map.get(id)!;
    bucket.students.push(s);
  }
  for (const bucket of map.values()) {
    bucket.total = bucket.students.length;
    bucket.assigned = bucket.students.filter(hasAccessCredential).length;
    bucket.pct = bucket.total ? Math.round((bucket.assigned / bucket.total) * 100) : 0;
  }
  return [...map.values()]
    .filter((b) => b.total > 0 || classes.some((c) => c.id === b.id))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function ClassAssignmentCard({
  bucket,
  cardFilter,
  onOpenClass,
}: {
  bucket: ClassCardBucket;
  cardFilter: CardFilter;
  onOpenClass: (classId: string) => void;
}) {
  const visible = bucket.students.filter((s) => {
    if (cardFilter === 'assigned') return hasAccessCredential(s);
    if (cardFilter === 'unassigned') return !hasAccessCredential(s);
    return true;
  });
  const missing = visible.filter((s) => !hasAccessCredential(s));
  const hasCard = visible.filter((s) => hasAccessCredential(s));

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpenClass(bucket.id.startsWith('name:') || bucket.id === '__none__' ? '' : bucket.id)}
        className="flex w-full flex-col gap-3 p-4 text-left sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-navy">{bucket.label}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {bucket.assigned} of {bucket.total} with card · {bucket.pct}%
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${bucket.pct}%` }}
          />
        </div>
      </button>
      <div className="grid flex-1 gap-0 border-t border-border sm:grid-cols-2">
        <div className="border-border p-3 sm:border-r sm:p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            <ShieldOff className="h-3.5 w-3.5" /> No card ({missing.length})
          </p>
          <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
            {missing.length === 0 ? (
              <li className="text-muted">Everyone has a card.</li>
            ) : (
              missing.slice(0, 8).map((s) => (
                <li key={s.id} className="truncate font-medium text-navy/90">
                  {s.fullName}
                </li>
              ))
            )}
            {missing.length > 8 ? (
              <li className="text-muted">+{missing.length - 8} more…</li>
            ) : null}
          </ul>
        </div>
        <div className="border-t border-border p-3 sm:border-t-0 sm:p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Card assigned ({hasCard.length})
          </p>
          <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
            {hasCard.length === 0 ? (
              <li className="text-muted">None yet.</li>
            ) : (
              hasCard.slice(0, 8).map((s) => (
                <li key={s.id} className="truncate text-navy/80">
                  <span className="font-medium">{s.fullName}</span>
                  <span className="ml-1 font-mono text-[10px] text-muted">{credentialLabel(s)}</span>
                </li>
              ))
            )}
            {hasCard.length > 8 ? (
              <li className="text-muted">+{hasCard.length - 8} more…</li>
            ) : null}
          </ul>
        </div>
      </div>
    </article>
  );
}

function hasAccessCredential(s: SmartAccessStudent): boolean {
  return Boolean(s.rfidUid?.trim() || s.fingerprintId?.trim());
}

function credentialLabel(s: SmartAccessStudent): string {
  if (s.rfidUid?.trim()) return s.rfidUid.trim();
  if (s.fingerprintId?.trim()) return `FP · ${s.fingerprintId.trim()}`;
  return '—';
}

function SummaryTile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: ReactNode;
  tone: 'navy' | 'emerald' | 'amber' | 'slate';
}) {
  const tones = {
    navy: 'from-navy/10 to-white border-navy/10',
    emerald: 'from-emerald-50 to-white border-emerald-100',
    amber: 'from-amber-50 to-white border-amber-100',
    slate: 'from-slate-50 to-white border-border',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-navy">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
        </div>
        <div className="rounded-xl bg-white/80 p-2 text-navy shadow-sm ring-1 ring-black/5">{icon}</div>
      </div>
    </div>
  );
}

export function SmartAccessReportsView() {
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<SmartAccessSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState<SmartAccessClass[]>([]);
  const [classId, setClassId] = useState('');
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [reportView, setReportView] = useState<ReportView>('dashboard');
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState<SmartAccessStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const selectedSchool = schools.find((s) => s.id === schoolId) ?? null;

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      setSchools(
        await fetchSmartAccessSchools({
          provinceId: appliedFilters.provinceId || undefined,
          districtId: appliedFilters.districtId || undefined,
          sectorId: appliedFilters.sectorId || undefined,
          search: appliedFilters.search.trim() || undefined,
        })
      );
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load schools');
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    if (!schoolId) {
      setClasses([]);
      setClassId('');
      setStudents([]);
      return;
    }
    void fetchSmartAccessClasses(schoolId)
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    const t = window.setTimeout(() => {
      setLoadingStudents(true);
      void fetchSmartAccessStudents(schoolId, {
        classId: classId || undefined,
        search: studentSearch.trim() || undefined,
      })
        .then(setStudents)
        .catch((e) => {
          toast.error((e as Error).message || 'Failed to load students');
          setStudents([]);
        })
        .finally(() => setLoadingStudents(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [schoolId, classId, studentSearch]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (cardFilter === 'assigned') return hasAccessCredential(s);
      if (cardFilter === 'unassigned') return !hasAccessCredential(s);
      return true;
    });
  }, [students, cardFilter]);

  const stats = useMemo(() => {
    const assigned = students.filter(hasAccessCredential).length;
    const total = students.length;
    return {
      total,
      assigned,
      unassigned: total - assigned,
      pct: total ? Math.round((assigned / total) * 100) : 0,
    };
  }, [students]);

  const classBuckets = useMemo(() => buildClassBuckets(students, classes), [students, classes]);

  function applySchoolFilters() {
    setAppliedFilters({ ...draftFilters });
    setSchoolId('');
  }

  function exportCsv() {
    if (!selectedSchool || !filteredStudents.length) return;
    const header = ['Student code', 'Full name', 'Class', 'Card assigned', 'RFID / credential', 'Gender', 'Status'];
    const lines = filteredStudents.map((s) =>
      [
        s.studentCode,
        s.fullName,
        s.className ?? '',
        hasAccessCredential(s) ? 'Yes' : 'No',
        credentialLabel(s).replace(/,/g, ' '),
        s.gender ?? '',
        s.status ?? '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-access-cards-${selectedSchool.organizationCode ?? selectedSchool.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasSchoolFilters = Boolean(
    appliedFilters.provinceId ||
      appliedFilters.districtId ||
      appliedFilters.sectorId ||
      appliedFilters.search.trim()
  );

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Smart Access</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Card assignment report by school and class — students with RFID or fingerprint credentials vs not yet
            assigned.
          </p>
        </div>
        <SmartAccessTabs active="reports" />
      </div>

      <SmartAccessSchoolToolbar
        values={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={applySchoolFilters}
        loading={loadingSchools}
        resultCount={schools.length}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-navy">Select school</p>
            <p className="text-xs text-muted">Choose one school to load classes and students.</p>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
            {loadingSchools ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
              </div>
            ) : schools.length === 0 ? (
              <SchoolListEmptyState hasFilters={hasSchoolFilters} onClearFilters={() => {
                setDraftFilters(EMPTY_FILTERS);
                setAppliedFilters(EMPTY_FILTERS);
              }} />
            ) : (
              schools.map((s) => (
                <SchoolListItem
                  key={s.id}
                  school={s}
                  selected={schoolId === s.id}
                  onSelect={() => setSchoolId(s.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          {!selectedSchool ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-20 text-center">
              <GraduationCap className="mb-3 h-10 w-10 text-muted/40" />
              <p className="font-semibold text-navy">Select a school</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Pick a school from the list to view class filters and student card assignment status.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                <SchoolLogo logoUrl={selectedSchool.logoUrl} name={selectedSchool.name} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy">{selectedSchool.name}</p>
                  <p className="text-xs text-muted">
                    {[selectedSchool.district, selectedSchool.sector].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile
                  label="Students (filter)"
                  value={stats.total}
                  icon={<Users className="h-5 w-5" />}
                  tone="navy"
                />
                <SummaryTile
                  label="Card assigned"
                  value={stats.assigned}
                  sub={`${stats.pct}% of loaded roster`}
                  icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
                  tone="emerald"
                />
                <SummaryTile
                  label="Not assigned"
                  value={stats.unassigned}
                  icon={<ShieldOff className="h-5 w-5 text-amber-700" />}
                  tone="amber"
                />
                <SummaryTile
                  label="Classes"
                  value={classes.length}
                  icon={<CreditCard className="h-5 w-5" />}
                  tone="slate"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-border bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                    <div className="inline-flex rounded-xl border border-border bg-white p-1 shadow-sm">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          reportView === 'dashboard' ? 'bg-navy text-white' : 'text-navy hover:bg-slate-50'
                        }`}
                        onClick={() => setReportView('dashboard')}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        By class
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          reportView === 'table' ? 'bg-navy text-white' : 'text-navy hover:bg-slate-50'
                        }`}
                        onClick={() => setReportView('table')}
                      >
                        <List className="h-3.5 w-3.5" />
                        Student list
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary text-sm sm:ml-auto"
                      onClick={exportCsv}
                      disabled={!filteredStudents.length}
                    >
                      <Download className="mr-1.5 inline h-4 w-4" />
                      Export CSV
                    </button>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <label className="min-w-[140px] flex-1 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Class</span>
                      <select
                        className="input w-full"
                        value={classId}
                        onChange={(e) => {
                          setClassId(e.target.value);
                          if (e.target.value) setReportView('table');
                        }}
                      >
                        <option value="">All classes</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label ?? c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-[140px] space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Card status</span>
                      <select
                        className="input w-full"
                        value={cardFilter}
                        onChange={(e) => setCardFilter(e.target.value as CardFilter)}
                      >
                        <option value="all">All students</option>
                        <option value="assigned">Card assigned</option>
                        <option value="unassigned">No card yet</option>
                      </select>
                    </label>
                    <label className="min-w-[200px] flex-[2] space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Search</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                          className="input w-full pl-9"
                          placeholder="Full name or code (e.g. ISHIMWE Theoneste)"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {reportView === 'dashboard' && !classId ? (
                  <div className="p-4 sm:p-5">
                    {loadingStudents ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted" />
                      </div>
                    ) : classBuckets.length === 0 ? (
                      <p className="py-12 text-center text-sm text-muted">No classes or students for this school yet.</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {classBuckets.map((bucket) =>
                          bucket.total === 0 ? null : (
                            <ClassAssignmentCard
                              key={bucket.id}
                              bucket={bucket}
                              cardFilter={cardFilter}
                              onOpenClass={(id) => {
                                if (id) {
                                  setClassId(id);
                                  setReportView('table');
                                }
                              }}
                            />
                          )
                        )}
                      </div>
                    )}
                    <p className="mt-4 text-center text-xs text-muted">
                      Tap a class to open the full student list · switch to <strong>Student list</strong> for search across
                      all rows.
                    </p>
                  </div>
                ) : null}

                {(reportView === 'table' || classId) ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-white text-[11px] font-semibold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Card</th>
                        <th className="px-4 py-3">Credential</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStudents ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-16 text-center text-muted">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-muted">
                            No students match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => {
                          const assigned = hasAccessCredential(s);
                          return (
                            <tr key={s.id} className="border-b border-border/80 hover:bg-slate-50/80">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-border">
                                    {s.photoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-navy/40">
                                        {s.fullName.slice(0, 1)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-navy">{s.fullName}</p>
                                    <p className="font-mono text-xs text-muted">{s.studentCode}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-navy/80">{s.className ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    assigned
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {assigned ? (
                                    <>
                                      <ShieldCheck className="h-3.5 w-3.5" /> Assigned
                                    </>
                                  ) : (
                                    <>
                                      <ShieldOff className="h-3.5 w-3.5" /> Not assigned
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-navy/70">{credentialLabel(s)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                ) : null}
                {reportView === 'table' || classId ? (
                  !loadingStudents && filteredStudents.length > 0 ? (
                    <p className="border-t border-border px-4 py-2 text-xs text-muted">
                      Showing {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'}
                      {cardFilter !== 'all' ? ` (${cardFilter})` : ''}.
                    </p>
                  ) : null
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

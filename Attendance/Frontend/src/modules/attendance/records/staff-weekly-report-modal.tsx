'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  CalendarRange,
  Check,
  FileDown,
  Loader2,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { weekDaysIso, weekRangeIso, isoWeekNumber } from '@/components/attendance-filters';
import { attendanceApi, type AttendanceRecord } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  exportStaffWeeklyPdf,
  type StaffWeeklyCell,
  type StaffWeeklyDay,
  type StaffWeeklyRow,
} from '@/utils/export-attendance-pdf';
import { buildSchoolPdfBranding, fetchSchoolOrganizationProfile } from '@/utils/school-pdf-branding';
import { useToast } from '@/shared/notifications';

type ReportScope = 'all' | 'department' | 'position' | 'selected';

type StaffOption = {
  staffId: string;
  fullName: string;
  employeeNumber: string | null;
  department: string | null;
  role: string | null;
};

const SCOPE_OPTIONS: {
  id: ReportScope;
  label: string;
  desc: string;
  icon: typeof Users;
}[] = [
  { id: 'all', label: 'All staff', desc: 'Every staff member', icon: Users },
  { id: 'department', label: 'By department', desc: 'One department', icon: Building2 },
  { id: 'position', label: 'By position', desc: 'One role or position', icon: Briefcase },
  { id: 'selected', label: 'Selected staff', desc: 'Pick individuals', icon: UserCheck },
];

function nameKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function weekdayName(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
}

function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function toWeeklyCell(record: AttendanceRecord): StaffWeeklyCell {
  const status = record.attendanceStatus ?? record.display?.attendanceStatus ?? record.status;
  if (status === 'ABSENT') return { status: 'ABSENT' };
  const punctuality = record.punctuality ?? record.display?.punctuality;
  const checkoutStatus = record.checkoutStatus ?? record.display?.checkoutStatus;
  const base = {
    entryTime: record.entryTime ?? null,
    exitTime: record.exitTime ?? null,
    expectedArrival: record.expectedArrival ?? null,
  };
  if (checkoutStatus === 'PENDING') return { ...base, status: 'PENDING_CHECKOUT' };
  if (punctuality === 'LATE') return { ...base, status: 'LATE' };
  return { ...base, status: 'PRESENT' };
}

async function fetchAllStaff(): Promise<StaffOption[]> {
  const limit = 200;
  const all: StaffOption[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await attendanceApi.staffCardAccess({ page, limit });
    const batch = data.data?.items ?? [];
    all.push(
      ...batch.map((s) => ({
        staffId: s.staffId,
        fullName: s.fullName,
        employeeNumber: s.employeeNumber,
        department: s.department,
        role: s.role,
      }))
    );
    if (batch.length < limit) break;
  }
  return all;
}

async function fetchStaffDay(
  date: string,
  filters: { department?: string; staffRole?: string }
): Promise<AttendanceRecord[]> {
  const limit = 100;
  const all: AttendanceRecord[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await attendanceApi.staffRoster({
      date,
      page,
      limit,
      sortBy: 'name',
      sortDir: 'asc',
      ...filters,
    });
    const batch = data.data?.items ?? [];
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export function StaffWeeklyReportModal({
  open,
  onClose,
  weekStart,
  schoolName,
  departments,
  staffRoles,
}: {
  open: boolean;
  onClose: () => void;
  weekStart: string;
  schoolName: string;
  departments: string[];
  staffRoles: string[];
}) {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [scope, setScope] = useState<ReportScope>('all');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingStaff(true);
    void fetchAllStaff()
      .then((list) => {
        if (!cancelled) setStaff(list);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, 'Could not load staff list'));
      })
      .finally(() => {
        if (!cancelled) setLoadingStaff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const { from, to } = weekRangeIso(weekStart);
  const weekLabel = `${longDate(from)} → ${longDate(to)} · Week ${isoWeekNumber(from)}`;
  const days: StaffWeeklyDay[] = useMemo(
    () =>
      weekDaysIso(weekStart)
        .slice(0, 5)
        .map((iso) => ({ iso, weekday: weekdayName(iso), label: shortDate(iso) })),
    [weekStart]
  );

  const departmentOptions = useMemo(
    () => uniqueValues([...departments, ...staff.map((s) => s.department)]),
    [departments, staff]
  );
  const positionOptions = useMemo(
    () => uniqueValues([...staffRoles, ...staff.map((s) => s.role)]),
    [staffRoles, staff]
  );

  const targetStaff = useMemo(() => {
    if (scope === 'department') {
      return department ? staff.filter((s) => (s.department ?? '') === department) : [];
    }
    if (scope === 'position') {
      return position ? staff.filter((s) => (s.role ?? '') === position) : [];
    }
    if (scope === 'selected') return staff.filter((s) => selected.has(s.staffId));
    return staff;
  }, [department, position, scope, selected, staff]);

  const selectionList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.employeeNumber ?? '').toLowerCase().includes(q) ||
        (s.department ?? '').toLowerCase().includes(q) ||
        (s.role ?? '').toLowerCase().includes(q)
    );
  }, [search, staff]);

  const allVisibleSelected =
    selectionList.length > 0 && selectionList.every((s) => selected.has(s.staffId));

  function toggleStaff(staffId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const s of selectionList) next.delete(s.staffId);
      } else {
        for (const s of selectionList) next.add(s.staffId);
      }
      return next;
    });
  }

  async function generatePdf() {
    if (!targetStaff.length) {
      toast.error('Choose at least one staff member');
      return;
    }
    setGenerating(true);
    try {
      const rosterFilters =
        scope === 'department' && department
          ? { department }
          : scope === 'position' && position
            ? { staffRole: position }
            : {};
      const perDay = await Promise.all(days.map((d) => fetchStaffDay(d.iso, rosterFilters)));

      const index = new Map<string, StaffOption>();
      for (const member of targetStaff) {
        index.set(`id:${member.staffId.toLowerCase()}`, member);
        if (member.employeeNumber) index.set(`code:${member.employeeNumber.toLowerCase()}`, member);
        index.set(`name:${nameKey(member.fullName)}`, member);
      }

      const rowByStaffId = new Map<string, StaffWeeklyRow>();
      for (const member of targetStaff) {
        rowByStaffId.set(member.staffId, {
          key: member.staffId,
          fullName: member.fullName,
          employeeNumber: member.employeeNumber,
          department: member.department,
          role: member.role,
          days: {},
        });
      }

      function matchStaff(record: AttendanceRecord) {
        const id = record.studentId?.trim().toLowerCase();
        if (id) {
          const hit = index.get(`id:${id}`);
          if (hit) return hit;
        }
        const code = record.studentCode?.trim().toLowerCase();
        if (code) {
          const hit = index.get(`code:${code}`);
          if (hit) return hit;
        }
        return index.get(`name:${nameKey(record.studentName)}`);
      }

      days.forEach((day, i) => {
        for (const record of perDay[i] ?? []) {
          const member = matchStaff(record);
          if (!member) continue;
          const row = rowByStaffId.get(member.staffId);
          if (!row) continue;
          const next = toWeeklyCell(record);
          const current = row.days[day.iso];
          if (!current || (current.status === 'ABSENT' && next.status !== 'ABSENT')) {
            row.days[day.iso] = next;
          }
        }
      });

      const rows = [...rowByStaffId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
      const scopeLabel =
        scope === 'department'
          ? `Department: ${department}`
          : scope === 'position'
            ? `Position: ${position}`
            : scope === 'selected'
              ? `${rows.length} selected staff`
              : 'All staff';

      const profile = await fetchSchoolOrganizationProfile();
      await exportStaffWeeklyPdf(
        buildSchoolPdfBranding(profile, weekLabel, {
          title: 'Weekly staff attendance report',
          subtitle: `${scopeLabel} · ${schoolName || 'School'}`,
          audienceLabel: 'Staff attendance matrix (Mon–Fri)',
        }),
        days,
        rows
      );
      toast.success(`Weekly PDF ready · ${rows.length} staff`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not generate weekly PDF'));
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#000435]/45 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col animate-fade-in-up overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000435] text-[#FCB038]">
              <CalendarRange size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#000435] sm:text-lg">Weekly staff attendance PDF</h2>
              <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">{weekLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost !p-2"
            onClick={onClose}
            aria-label="Close weekly report"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="rounded-2xl border border-[#FCB038]/40 bg-[#FCB038]/10 px-4 py-3 text-xs text-[#7a4b00] sm:text-sm">
            The report covers <strong>Monday to Friday</strong> of the selected week and includes
            check-in, check-out, lateness and absence per staff member.
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Report scope</p>
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {SCOPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = scope === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setScope(option.id)}
                    className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-[#000435] bg-[#000435] text-white shadow-sm'
                        : 'border-border bg-white text-navy hover:border-[#000435]/30 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} className={`mt-0.5 shrink-0 ${active ? 'text-[#FCB038]' : 'text-primary'}`} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold sm:text-sm">{option.label}</span>
                      <span className={`mt-0.5 block text-[10px] sm:text-xs ${active ? 'text-slate-200' : 'text-muted'}`}>
                        {option.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {scope === 'department' ? (
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Department</span>
              <select className="input w-full !py-2.5" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select a department…</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === 'position' ? (
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Position</span>
              <select className="input w-full !py-2.5" value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="">Select a position…</option>
                {positionOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === 'selected' ? (
            <div className="mt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="input w-full !py-2.5 pl-9"
                  placeholder="Search staff by name, ID, department or position…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {selected.size} selected · {selectionList.length} shown
                </span>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={toggleVisible}>
                    {allVisibleSelected ? 'Clear visible' : 'Select visible'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1 text-xs"
                    onClick={() => setSelected(new Set())}
                    disabled={selected.size === 0}
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border">
                {loadingStaff ? (
                  <p className="py-10 text-center text-sm text-muted">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  </p>
                ) : selectionList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">No staff match your search.</p>
                ) : (
                  selectionList.map((member) => {
                    const checked = selected.has(member.staffId);
                    return (
                      <label
                        key={member.staffId}
                        className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            checked ? 'border-[#000435] bg-[#000435] text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked ? <Check size={13} /> : null}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleStaff(member.staffId)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-navy">{member.fullName}</span>
                          <span className="block truncate font-mono text-[10px] text-muted">
                            {member.employeeNumber ?? '—'} · {member.department ?? '—'} · {member.role ?? '—'}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-2.5 py-1">
              <Users size={12} className="text-primary" />
              {loadingStaff ? 'Loading staff…' : `${staff.length} staff on file`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
              <Check size={12} />
              {targetStaff.length} in this report
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/70 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose} disabled={generating}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => void generatePdf()}
            disabled={generating || loadingStaff || targetStaff.length === 0}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {generating ? 'Building PDF…' : 'Generate weekly PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

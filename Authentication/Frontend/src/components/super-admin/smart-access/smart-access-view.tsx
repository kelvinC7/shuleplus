'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  MapPin,
  Radio,
  Search,
  UserSquare2,
  Users,
  X,
} from 'lucide-react';
import { useWebSerialRfid, WebSerialRfidProvider } from '@/hooks/use-web-serial-rfid';
import {
  SchoolListEmptyState,
  SmartAccessSchoolToolbar,
  type SchoolFilterValues,
} from '@/components/super-admin/smart-access/smart-access-school-toolbar';
import { SchoolLogo } from '@/components/super-admin/smart-access/school-logo';
import { staffSourceLabel } from '@/lib/staff-source-label';
import {
  fetchSmartAccessClasses,
  fetchSmartAccessSchools,
  fetchSmartAccessStaff,
  fetchSmartAccessStudents,
  saveStaffDigitalId,
  saveStudentDigitalId,
  type SmartAccessClass,
  type SmartAccessSchool,
  type SmartAccessStaff,
  type SmartAccessStudent,
} from '@/lib/smart-access-api';
import { getHttpErrorMessage } from '@/lib/http-error';
import { useToast } from '@/shared/notifications';

type Panel = 'students' | 'staff';

const EMPTY_FILTERS: SchoolFilterValues = {
  provinceId: '',
  districtId: '',
  sectorId: '',
  search: '',
};

const SCHOOLS_PAGE_SIZE = 12;

function SchoolsPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return [page - 2, page - 1, page, page + 1, page + 2];
  }, [page, totalPages]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted sm:text-sm">
        Showing <span className="font-semibold text-navy">{from}</span>–<span className="font-semibold text-navy">{to}</span> of{' '}
        <span className="font-semibold text-navy">{total}</span> schools
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="input !w-auto !py-1.5 !text-xs"
          >
            {[6, 12, 24, 48].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold transition ${
                n === page ? 'bg-navy text-white shadow-sm' : 'border border-border text-navy hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-navy/15 transition hover:bg-navy/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-navy transition hover:bg-slate-100';
const btnAssign =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-navy to-navy/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md sm:text-sm';

function ReaderSessionBar({ compact }: { compact?: boolean }) {
  const serial = useWebSerialRfid();

  if (!serial.supported) {
    return compact ? null : (
      <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-xs text-muted">
        Use Chrome or Edge for the USB reader.
      </p>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? '' : 'rounded-xl border border-border bg-slate-50/80 px-3 py-2.5'
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
          serial.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/80 text-slate-600'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${serial.connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
        {serial.connected ? 'Ready' : 'Offline'}
      </span>
      {serial.connected ? (
        <button type="button" className={`${btnSecondary} !px-3 !py-2 text-xs`} onClick={() => void serial.disconnect()}>
          Disconnect
        </button>
      ) : (
        <button type="button" className={`${btnSecondary} !px-3 !py-2 text-xs`} onClick={() => void serial.connect()}>
          <Radio className="h-3.5 w-3.5" />
          Connect reader
        </button>
      )}
      {serial.lastUid ? (
        <span className="font-mono text-[11px] font-semibold text-navy">{serial.lastUid}</span>
      ) : null}
    </div>
  );
}

function IdentityDrawer({
  open,
  onClose,
  school,
  kind,
  person,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  school: SmartAccessSchool;
  kind: Panel;
  person: SmartAccessStudent | SmartAccessStaff | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [rfidUid, setRfidUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const personRef = useRef(person);
  const schoolRef = useRef(school);
  const kindRef = useRef(kind);
  const rfidUidRef = useRef(rfidUid);

  personRef.current = person;
  schoolRef.current = school;
  kindRef.current = kind;
  rfidUidRef.current = rfidUid;

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!person) return;
    setRfidUid(person.rfidUid ?? '');
    setError(null);
  }, [person]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  const persistDigitalId = useCallback(
    async (uid: string, opts?: { fromScan?: boolean }) => {
      const currentPerson = personRef.current;
      const currentSchool = schoolRef.current;
      const currentKind = kindRef.current;
      if (!currentPerson || !currentSchool) return;

      const nextUid = uid.trim().toUpperCase();
      if (!nextUid) {
        const msg = 'Scan a card or enter a UID first';
        setError(msg);
        toast.warning(msg, 'Digital ID');
        return;
      }

      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setError(null);
      setRfidUid(nextUid);

      try {
        const body = { rfidUid: nextUid };
        if (currentKind === 'students') {
          await saveStudentDigitalId(currentSchool.id, currentPerson.id, body);
        } else {
          await saveStaffDigitalId(
            currentSchool.id,
            currentPerson.id,
            body,
            (currentPerson as SmartAccessStaff).source
          );
        }
        toast.success(
          opts?.fromScan
            ? `${nextUid} saved for ${currentPerson.fullName}`
            : `Digital ID saved for ${currentPerson.fullName}`,
          'Card assigned'
        );
        onSaved();
        handleClose();
      } catch (err: unknown) {
        const msg = getHttpErrorMessage(err, 'Could not save Digital ID');
        setError(msg);
        const conflict = axios.isAxiosError(err) && err.response?.status === 409;
        if (conflict) {
          toast.error(msg, 'Card already taken');
        } else {
          toast.error(msg, 'Could not save');
        }
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [handleClose, onSaved, toast]
  );

  const handleCard = useCallback(
    (uid: string) => {
      const next = uid.trim().toUpperCase();
      if (!next) return;
      setRfidUid(next);
      // Auto-save on scan so class-by-class assign stays on the same reader session
      void persistDigitalId(next, { fromScan: true });
    },
    [persistDigitalId]
  );

  useWebSerialRfid(open ? handleCard : undefined);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  if (!open || !person || !school) return null;

  const label = person.fullName;
  const subtitle =
    kind === 'students'
      ? `${(person as SmartAccessStudent).studentCode}${(person as SmartAccessStudent).className ? ` · ${(person as SmartAccessStudent).className}` : ''}`
      : `${(person as SmartAccessStaff).employeeNumber} · ${(person as SmartAccessStaff).position}`;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className={`absolute inset-0 bg-navy/50 backdrop-blur-[3px] transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-[-12px_0_48px_rgba(0,4,53,0.18)] transition-transform duration-300 ease-out sm:max-w-lg ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-border bg-navy px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold">{label}</p>
              <p className="mt-0.5 truncate text-sm text-white/75">{subtitle}</p>
            </div>
            <button type="button" onClick={handleClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Card UID</span>
            <input
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
              placeholder="Scan to assign"
              className="input w-full font-mono text-base tracking-wider"
              autoFocus
            />
          </label>

          <ReaderSessionBar />

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border bg-slate-50/80 p-4 sm:p-5">
          <button type="button" className={`${btnSecondary} flex-1`} onClick={handleClose}>
            Close
          </button>
          <button
            type="button"
            className={`${btnPrimary} flex-1`}
            disabled={saving}
            onClick={() => void persistDigitalId(rfidUidRef.current)}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function SchoolDetailDrawer({
  school,
  onClose,
  onAssign,
}: {
  school: SmartAccessSchool;
  onClose: () => void;
  onAssign: (kind: Panel, person: SmartAccessStudent | SmartAccessStaff) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<Panel>('students');
  const [classes, setClasses] = useState<SmartAccessClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [students, setStudents] = useState<SmartAccessStudent[]>([]);
  const [staff, setStaff] = useState<SmartAccessStaff[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setPanel('students');
    setSelectedClassId('');
    setPeopleSearch('');
  }, [school.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingClasses(true);
    void fetchSmartAccessClasses(school.id)
      .then((rows) => {
        if (!cancelled) setClasses([...rows].sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [school.id]);

  const loadPeople = useCallback(async () => {
    setLoadingPeople(true);
    try {
      if (panel === 'students') {
        const selected = classes.find((c) => c.id === selectedClassId);
        const rows = await fetchSmartAccessStudents(school.id, {
          search: peopleSearch.trim() || undefined,
          classId: selectedClassId || undefined,
          className: !selectedClassId && selected ? selected.label : undefined,
        });
        setStudents(rows);
      } else {
        setStaff(await fetchSmartAccessStaff(school.id, { search: peopleSearch.trim() || undefined }));
      }
    } catch {
      if (panel === 'students') setStudents([]);
      else setStaff([]);
    } finally {
      setLoadingPeople(false);
    }
  }, [school.id, panel, peopleSearch, selectedClassId, classes]);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, []);

  const peopleList = useMemo(() => {
    const list = panel === 'students' ? students : staff;
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [panel, students, staff]);

  const assignedCount = peopleList.filter((p) => p.rfidUid).length;

  function handleClose() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close school panel"
        onClick={handleClose}
        className={`absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        className={`relative flex h-full w-full max-w-full flex-col bg-white shadow-[-8px_0_40px_rgba(15,23,42,0.16)] transition-transform duration-300 ease-out sm:max-w-xl md:max-w-2xl lg:max-w-3xl ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-border bg-gradient-to-r from-slate-50 via-white to-primary/5 px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-border">
              <SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" iconClassName="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-navy sm:text-xl">{school.name}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted sm:text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {[school.district, school.sector].filter(Boolean).join(' · ') || 'Location not set'}
              </p>
              {school.organizationCode && (
                <p className="mt-1 font-mono text-[10px] text-navy/50 sm:text-xs">{school.organizationCode}</p>
              )}
            </div>
            <button type="button" onClick={handleClose} className={btnGhost}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPanel('students')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  panel === 'students' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
                }`}
              >
                <Users className="h-4 w-4" />
                Students
              </button>
              <button
                type="button"
                onClick={() => setPanel('staff')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  panel === 'staff' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
                }`}
              >
                <UserSquare2 className="h-4 w-4" />
                Staff
              </button>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 sm:text-xs">
              {assignedCount} / {peopleList.length} IDs assigned
            </span>
          </div>

          <div className="mt-3">
            <ReaderSessionBar />
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-b border-border px-4 py-3 sm:px-6">
          {panel === 'students' && (
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <GraduationCap className="h-3.5 w-3.5" />
                Class
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input w-full"
                disabled={loadingClasses}
              >
                <option value="">All classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              placeholder={panel === 'students' ? 'Search students by name or code…' : 'Search staff…'}
              className="input w-full pl-10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          {loadingPeople ? (
            <div className="flex justify-center py-16 text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : peopleList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-3 h-10 w-10 text-muted/40" />
              <p className="font-medium text-navy">No records found</p>
              <p className="mt-1 text-sm text-muted">
                {panel === 'students' && selectedClassId
                  ? 'Try another class or clear the class filter.'
                  : panel === 'staff'
                    ? 'No staff found in HR, Users & Access, or Timetable for this school.'
                    : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2 pb-4">
              {peopleList.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:border-primary/25 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{person.fullName}</p>
                    <p className="mt-0.5 text-xs text-muted sm:text-sm">
                      {panel === 'students'
                        ? `${(person as SmartAccessStudent).studentCode} · ${(person as SmartAccessStudent).className ?? '-'}`
                        : `${(person as SmartAccessStaff).employeeNumber} · ${(person as SmartAccessStaff).position}${
                            (person as SmartAccessStaff).source
                              ? ` · ${staffSourceLabel((person as SmartAccessStaff).source)}`
                              : ''
                          }`}
                    </p>
                    <div className="mt-2">
                      {person.rfidUid ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-800 sm:text-xs">
                          {person.rfidUid}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Digital ID not assigned</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={btnAssign}
                    onClick={() => onAssign(panel, person)}
                  >
                    {person.rfidUid ? 'Update' : 'Assign ID'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function SchoolCard({ school, onOpen }: { school: SmartAccessSchool; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-border transition group-hover:ring-primary/30">
          <SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" />
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            school.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {school.status}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-base font-bold text-navy group-hover:text-navy">{school.name}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{[school.district, school.sector].filter(Boolean).join(' · ') || 'Location not set'}</span>
      </p>
      {school.organizationCode && (
        <p className="mt-1 font-mono text-[10px] text-navy/50">{school.organizationCode}</p>
      )}
      {school.locationComplete === false && (
        <p className="mt-2 text-[10px] font-medium text-amber-700">Complete location in org settings</p>
      )}
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

export function SmartAccessView() {
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<SmartAccessSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [drawerSchool, setDrawerSchool] = useState<SmartAccessSchool | null>(null);
  const [identityTarget, setIdentityTarget] = useState<{
    school: SmartAccessSchool;
    kind: Panel;
    person: SmartAccessStudent | SmartAccessStaff;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [schoolPage, setSchoolPage] = useState(1);
  const [schoolPageSize, setSchoolPageSize] = useState(SCHOOLS_PAGE_SIZE);

  const schoolTotalPages = Math.max(1, Math.ceil(schools.length / schoolPageSize));
  const safeSchoolPage = Math.min(schoolPage, schoolTotalPages);
  const schoolPageStart = (safeSchoolPage - 1) * schoolPageSize;
  const pagedSchools = schools.slice(schoolPageStart, schoolPageStart + schoolPageSize);

  const hasFilters = Boolean(
    appliedFilters.provinceId ||
      appliedFilters.districtId ||
      appliedFilters.sectorId ||
      appliedFilters.search.trim()
  );

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
    } catch {
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    setSchoolPage(1);
  }, [schools.length, appliedFilters, schoolPageSize]);

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  useEffect(() => {
    setAppliedFilters((prev) => ({
      ...prev,
      provinceId: draftFilters.provinceId,
      districtId: draftFilters.districtId,
      sectorId: draftFilters.sectorId,
    }));
  }, [draftFilters.provinceId, draftFilters.districtId, draftFilters.sectorId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, search: draftFilters.search }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftFilters.search]);

  return (
    <WebSerialRfidProvider>
    <div className="space-y-5 pb-8">
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Smart Access</h1>

      <SmartAccessSchoolToolbar
        values={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={applyFilters}
        loading={loadingSchools}
        resultCount={schools.length}
      />

      <div>
        {loadingSchools ? (
          <div className="flex justify-center rounded-2xl border border-border bg-white py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : schools.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <SchoolListEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pagedSchools.map((school) => (
                <SchoolCard key={school.id} school={school} onOpen={() => setDrawerSchool(school)} />
              ))}
            </div>
            {schools.length > 0 && (
              <SchoolsPagination
                page={safeSchoolPage}
                totalPages={schoolTotalPages}
                total={schools.length}
                pageSize={schoolPageSize}
                onPageChange={setSchoolPage}
                onPageSizeChange={setSchoolPageSize}
              />
            )}
          </div>
        )}
      </div>

      {drawerSchool && (
        <SchoolDetailDrawer
          key={`${drawerSchool.id}-${refreshKey}`}
          school={drawerSchool}
          onClose={() => setDrawerSchool(null)}
          onAssign={(kind, person) => setIdentityTarget({ school: drawerSchool, kind, person })}
        />
      )}

      {identityTarget && (
        <IdentityDrawer
          open
          onClose={() => setIdentityTarget(null)}
          school={identityTarget.school}
          kind={identityTarget.kind}
          person={identityTarget.person}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
    </WebSerialRfidProvider>
  );
}

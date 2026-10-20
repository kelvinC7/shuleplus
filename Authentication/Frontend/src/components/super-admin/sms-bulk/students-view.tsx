'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  School,
  Search,
  Send,
  ShieldCheck,
  ShieldOff,
  User,
  UserX,
  Users,
  ArrowUpDown,
  SlidersHorizontal,
  MessageSquare,
  Power,
} from 'lucide-react';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  fetchDistricts,
  fetchProvinces,
  fetchSectors,
  fetchSmartAccessClasses,
  fetchSmartAccessParents,
  fetchSmartAccessSchools,
  fetchSmartAccessStudents,
  toggleParentSms,
  bulkParentSms,
  sendSmsToParent,
  type LocationOption,
  type SmartAccessClass,
  type SmartAccessParent,
  type SmartAccessSchool,
  type SmartAccessStudent,
} from '@/lib/smart-access-api';
import {
  SmsCard,
  SmsDataPanel,
  SmsPageShell,
  SmsPagination,
  SmsStatusPill,
  SmsTable,
  smsBtnOutline,
  smsBtnPrimary,
  smsInputClass,
} from './sms-page-shell';
import { SmsProviderBanner } from './sms-provider-banner';

function relationshipLabel(role: string | null | undefined): string {
  const r = (role ?? '').toUpperCase();
  if (r === 'FATHER') return 'Father';
  if (r === 'MOTHER') return 'Mother';
  if (r === 'GUARDIAN') return 'Guardian';
  return role || 'Guardian';
}

function genderLabel(g: string | null | undefined): string {
  if (g === 'M') return 'Male';
  if (g === 'F') return 'Female';
  return g ?? '—';
}

export function StudentsParentsView() {
  const toast = useToast();
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [sectors, setSectors] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [sectorId, setSectorId] = useState('');

  const [schools, setSchools] = useState<SmartAccessSchool[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState<SmartAccessClass[]>([]);
  const [classId, setClassId] = useState('');

  const [students, setStudents] = useState<SmartAccessStudent[]>([]);
  const [parents, setParents] = useState<SmartAccessParent[]>([]);
  const [selected, setSelected] = useState<SmartAccessStudent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [bulkEnabling, setBulkEnabling] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 14;

  /* ── location loaders ── */
  useEffect(() => {
    fetchProvinces().then(setProvinces).catch((e) => toast.error(e.message));
  }, [toast]);

  const loadDistricts = useCallback(
    (pid: string) => {
      setDistricts([]);
      if (!pid) return;
      fetchDistricts(pid).then(setDistricts).catch((e) => toast.error(e.message));
    },
    [toast],
  );

  const loadSectors = useCallback(
    (did: string) => {
      setSectors([]);
      if (!did) return;
      fetchSectors(did).then(setSectors).catch((e) => toast.error(e.message));
    },
    [toast],
  );

  const loadSchools = useCallback(
    async (pid: string, did: string, sid: string, q: string) => {
      setLoadingSchools(true);
      try {
        setSchools(
          await fetchSmartAccessSchools({
            provinceId: pid || undefined,
            districtId: did || undefined,
            sectorId: sid || undefined,
            search: q.trim() || undefined,
          }),
        );
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoadingSchools(false);
      }
    },
    [toast],
  );

  useEffect(() => { loadDistricts(provinceId); }, [provinceId, loadDistricts]);
  useEffect(() => { loadSectors(districtId); }, [districtId, loadSectors]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadSchools(provinceId, districtId, sectorId, search);
    }, 250);
    return () => window.clearTimeout(t);
  }, [provinceId, districtId, sectorId, search, loadSchools]);

  /* ── selection ── */
  const resetSelection = useCallback(() => {
    setSchoolId(''); setClassId(''); setStudents([]); setClasses([]); setParents([]); setSelected(null); setPage(1);
  }, []);

  useEffect(() => { resetSelection(); }, [provinceId, districtId, sectorId, resetSelection]);

  const loadStudents = useCallback(
    async (oid: string, cid: string, q: string) => {
      setLoadingStudents(true);
      try {
        setStudents(await fetchSmartAccessStudents(oid, { search: q.trim() || undefined, classId: cid || undefined }));
        setPage(1);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoadingStudents(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!schoolId) return;
    setClasses([]); setParents([]);
    fetchSmartAccessClasses(schoolId).then(setClasses).catch((e) => toast.error(e.message));
    fetchSmartAccessParents(schoolId).then(setParents).catch((e) => toast.error(e.message));
  }, [schoolId, toast]);

  useEffect(() => {
    if (!schoolId) return;
    void loadStudents(schoolId, classId, search);
  }, [schoolId, classId, search, loadStudents]);

  function selectSchool(oid: string) {
    setSchoolId(oid); setClassId(''); setSelected(null); setStudents([]); setParents([]); setPage(1);
  }

  function openDrawer(s: SmartAccessStudent) {
    setSelected(s);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 200);
  }

  /* ── derived ── */
  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageRows = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedSchool = schools.find((s) => s.id === schoolId) ?? null;
  const activeFilterCount = [provinceId, districtId, sectorId].filter(Boolean).length;

  const reachableCount = useMemo(
    () => students.filter((s) => parents.some((p) => p.students.some((sp) => sp.studentId === s.id && p.phone))).length,
    [students, parents],
  );

  const selectedParents = useMemo(() => {
    if (!selected) return [];
    return parents.filter((p) => p.students.some((sp) => sp.studentId === selected.id));
  }, [selected, parents]);

  const parentCountFor = useCallback(
    (sid: string) => parents.filter((p) => p.students.some((sp) => sp.studentId === sid)).length,
    [parents],
  );

  const studentHasPhone = useCallback(
    (sid: string) => parents.some((p) => p.students.some((sp) => sp.studentId === sid) && p.phone),
    [parents],
  );

  const smsEnabledParents = useMemo(
    () => parents.filter((p) => p.smsEnabled && p.phone).length,
    [parents],
  );

  async function handleEnableAllParents(enabled: boolean) {
    if (!schoolId || !selectedSchool) return;
    setBulkEnabling(true);
    try {
      const result = await bulkParentSms(schoolId, enabled);
      setParents((prev) =>
        prev.map((p) =>
          p.phone ? { ...p, smsEnabled: enabled } : p
        )
      );
      toast.success(
        enabled
          ? `SMS enabled for ${result.updated} parents at ${selectedSchool.name}. Gate attendance SMS is on.`
          : `SMS disabled for ${result.updated} parents at ${selectedSchool.name}.`
      );
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update parents');
    } finally {
      setBulkEnabling(false);
    }
  }

  const clearFilters = () => { setProvinceId(''); setDistrictId(''); setSectorId(''); setSearch(''); };

  return (
    <SmsPageShell
      title="Students & Parents"
      description="Live directory of schools, students and guardians across the Student Management module."
    >
      <SmsProviderBanner />

      {/* ─── Summary cards ─── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Schools" value={schools.length} icon={<Landmark className="h-5 w-5" />} tone="navy" />
        <SummaryCard label="Students" value={schoolId ? students.length : 0} icon={<GraduationCap className="h-5 w-5" />} tone="sky" />
        <SummaryCard label="Classes" value={classes.length} icon={<School className="h-5 w-5" />} tone="amber" />
        <SummaryCard label="Parents reachable" value={reachableCount} icon={<Phone className="h-5 w-5" />} tone="emerald" />
      </div>

      {/* ─── Filters ─── */}
      <SmsCard className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-slate-50/80 px-5 py-3">
          <SlidersHorizontal className="h-4 w-4 text-navy" />
          <span className="text-sm font-semibold text-navy">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-navy">
              {activeFilterCount}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="ml-auto text-[11px] font-medium text-navy/60 hover:text-navy transition">
              Clear all
            </button>
          )}
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Province"
            icon={<Landmark className="h-3.5 w-3.5" />}
            value={provinceId}
            onChange={(v) => { setProvinceId(v); }}
            placeholder="All provinces"
            options={provinces}
          />
          <FilterSelect
            label="District"
            icon={<MapPin className="h-3.5 w-3.5" />}
            value={districtId}
            onChange={(v) => { setDistrictId(v); }}
            placeholder="All districts"
            options={districts}
            disabled={!provinceId}
          />
          <FilterSelect
            label="Sector"
            icon={<School className="h-3.5 w-3.5" />}
            value={sectorId}
            onChange={(v) => { setSectorId(v); }}
            placeholder="All sectors"
            options={sectors}
            disabled={!districtId}
          />
          <FilterSelect
            label="School"
            icon={<Landmark className="h-3.5 w-3.5" />}
            value={schoolId}
            onChange={selectSchool}
            placeholder={loadingSchools ? 'Loading…' : 'All schools'}
            options={schools.map((s) => ({ id: s.id, name: `${s.name}${s.district ? ` · ${s.district}` : ''}` }))}
          />
        </div>

        <div className="border-t border-border bg-slate-50/50 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name or code…"
              className={`${smsInputClass} pl-9 bg-white`}
            />
          </div>
        </div>
      </SmsCard>

      {/* ─── Active class filter chips ─── */}
      {classes.length > 0 && schoolId && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" /> Classes:
          </span>
          <button
            type="button"
            onClick={() => setClassId('')}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              !classId
                ? 'border-navy bg-navy text-white'
                : 'border-border bg-white text-muted hover:border-navy/30 hover:text-navy'
            }`}
          >
            All
          </button>
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClassId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                classId === c.id
                  ? 'border-navy bg-navy text-white'
                  : 'border-border bg-white text-muted hover:border-navy/30 hover:text-navy'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── School SMS control + bilingual templates ─── */}
      {schoolId && selectedSchool && (
        <SmsCard className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-navy to-navy/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-white">{selectedSchool.name}</p>
              <p className="mt-0.5 text-xs text-white/70">
                {smsEnabledParents} of {parents.filter((p) => p.phone).length} parents with phone have SMS On
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={bulkEnabling || parents.filter((p) => p.phone).length === 0}
                onClick={() => void handleEnableAllParents(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {bulkEnabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                Enable all parents SMS
              </button>
              <button
                type="button"
                disabled={bulkEnabling}
                onClick={() => void handleEnableAllParents(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
              >
                Disable all
              </button>
            </div>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Entry SMS (Kinyarwanda + English)</p>
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-navy/90">
                {`ShulePlus – ${selectedSchool.name}: Umwana wawe [Student Name] yageze ku ishuri saa [Time]. Yinjiye akoresheje ikarita ye.\nEnglish: Your child [Student Name] arrived at ${selectedSchool.name} at [Time] using their student card.`}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Exit SMS (Kinyarwanda + English)</p>
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-navy/90">
                {`ShulePlus – ${selectedSchool.name}: Umwana wawe [Student Name] yasohotse ku ishuri saa [Time]. Yifashishije ikarita ye.\nEnglish: Your child [Student Name] left ${selectedSchool.name} at [Time] using their student card.`}
              </p>
            </div>
          </div>
        </SmsCard>
      )}

      {/* ─── Students table ─── */}
      <SmsDataPanel loading={loadingStudents} loadingLabel="Loading students…">
        {!schoolId ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5">
              <MapPin className="h-7 w-7 text-navy/30" />
            </div>
            <p className="text-sm font-medium text-navy/70">Select a school to view its students</p>
            <p className="max-w-xs text-xs text-muted">Use the filters above to narrow down by province, district, or sector, then pick a school.</p>
          </div>
        ) : (
          <>
            <SmsTable
              headers={['Student', 'Class', 'Gender', 'Parents', 'SMS', '']}
              empty={!pageRows.length}
              emptyLabel="No students match your filters."
            >
              {pageRows.map((s) => (
                <tr key={s.id} className="group cursor-pointer border-t border-border transition hover:bg-navy/[0.02]" onClick={() => openDrawer(s)}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-navy group-hover:text-primary">{s.fullName}</p>
                    <p className="text-[11px] text-muted">{s.studentCode}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm">{s.className ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-muted">{genderLabel(s.gender)}</td>
                  <td className="px-5 py-3.5 text-sm">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-navy/5 px-2 text-xs font-semibold text-navy">
                      {parentCountFor(s.id)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {studentHasPhone(s.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Reachable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-muted">
                        <UserX className="h-3 w-3" /> No phone
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight className="h-4 w-4 text-muted/40 transition group-hover:text-navy" />
                  </td>
                </tr>
              ))}
            </SmsTable>
            <SmsPagination
              page={page}
              totalPages={totalPages}
              from={(page - 1) * PAGE_SIZE + 1}
              to={Math.min(page * PAGE_SIZE, students.length)}
              total={students.length}
              noun="students"
              onPageChange={setPage}
            />
          </>
        )}
      </SmsDataPanel>

      {/* ─── Drawer overlay ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in-right">
            <DrawerHeader student={selected} school={selectedSchool} onClose={closeDrawer} toast={toast} />
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {selected && (
                <>
                  <DrawerStudentInfo student={selected} school={selectedSchool} />
                  <DrawerParentList parents={selectedParents} student={selected} organizationId={schoolId} toast={toast} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </SmsPageShell>
  );
}

/* ─────────────── Sub-components ─────────────── */

function FilterSelect({
  label, icon, value, onChange, placeholder, options, disabled,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const hasValue = Boolean(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-navy/70">
        {icon}
        {label}
        {hasValue && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-8 text-sm text-navy outline-none transition
            ${disabled ? 'cursor-not-allowed border-border/60 bg-slate-50 text-muted' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/10'}
            ${hasValue ? 'border-primary/40 font-medium' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }: {
  label: string; value: string | number; icon: React.ReactNode;
  tone: 'navy' | 'sky' | 'amber' | 'emerald';
}) {
  const tones = {
    navy: 'bg-navy/5 text-navy',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-white px-4 py-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="text-2xl font-bold text-navy leading-tight">{value}</p>
      </div>
    </div>
  );
}

/* ─── Drawer header ─── */
function DrawerHeader({ student, school, onClose, toast }: {
  student: SmartAccessStudent | null;
  school: SmartAccessSchool | null;
  onClose: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  if (!student) return null;
  return (
    <div className="flex items-center gap-4 border-b border-border bg-gradient-to-r from-navy via-navy to-navy/90 px-6 py-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white">
        <User className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold text-white">{student.fullName}</p>
        <p className="truncate text-xs text-white/60">{student.studentCode}{school ? ` · ${school.name}` : ''}</p>
      </div>
      <button
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ─── Drawer student info ─── */
function DrawerStudentInfo({ student, school }: { student: SmartAccessStudent; school: SmartAccessSchool | null }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50/60 p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Student Information</h3>
      <div className="grid grid-cols-2 gap-3">
        <InfoTile label="School" value={school?.name ?? '—'} />
        <InfoTile label="Class" value={student.className ?? '—'} />
        <InfoTile label="Gender" value={genderLabel(student.gender)} />
        <InfoTile label="Status" value={student.status ?? '—'} />
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 border border-border/50">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

/* ─── Drawer parent list ─── */
function DrawerParentList({ parents, student, organizationId, toast }: {
  parents: SmartAccessParent[];
  student: SmartAccessStudent;
  organizationId: string;
  toast: ReturnType<typeof useToast>;
}) {
  const [parentStates, setParentStates] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    parents.forEach((p) => { init[p.id] = p.smsEnabled; });
    return init;
  });
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [smsBody, setSmsBody] = useState('');
  const [showComposer, setShowComposer] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    parents.forEach((p) => { next[p.id] = p.smsEnabled; });
    setParentStates(next);
  }, [parents]);

  async function handleToggle(parentId: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled;
    const parent = parents.find((p) => p.id === parentId);
    setToggling((s) => ({ ...s, [parentId]: true }));
    try {
      await toggleParentSms(organizationId, parentId, newEnabled);
      setParentStates((s) => ({ ...s, [parentId]: newEnabled }));
      if (newEnabled) {
        toast.success(`SMS enabled for ${parent?.fullName ?? 'parent'}.`);
        if (parent?.phone) {
          setSending((s) => ({ ...s, [parentId]: true }));
          try {
            await sendSmsToParent(
              parent.phone,
              `Dear ${parent.fullName}, SMS notifications are now enabled for ${student.fullName}. You will receive important updates from the school.`,
              student.fullName,
              parent.fullName,
            );
            toast.success(`Welcome SMS sent to ${parent.fullName}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Welcome SMS failed to send');
          } finally {
            setSending((s) => ({ ...s, [parentId]: false }));
          }
        }
      } else {
        toast.success(`SMS disabled for ${parent?.fullName ?? 'parent'}.`);
      }
    } catch {
      toast.error('Failed to update SMS preference');
    } finally {
      setToggling((s) => ({ ...s, [parentId]: false }));
    }
  }

  async function handleSendDirect(parent: SmartAccessParent) {
    if (!parent.phone || !smsBody.trim()) return;
    if (!parentStates[parent.id]) {
      toast.error(`SMS is disabled for ${parent.fullName}. Enable SMS first before sending.`);
      return;
    }
    setSending((s) => ({ ...s, [parent.id]: true }));
    try {
      await sendSmsToParent(parent.phone, smsBody, student.fullName, parent.fullName);
      toast.success(`SMS sent to ${parent.fullName}`);
      setSmsBody('');
      setShowComposer(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'SMS failed to send');
    } finally {
      setSending((s) => ({ ...s, [parent.id]: false }));
    }
  }

  const enabledCount = parents.filter((p) => parentStates[p.id]).length;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <Users className="h-3.5 w-3.5" />
        Parents / Guardians
        {parents.length > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-navy/10 px-1.5 text-[10px] font-bold text-navy">
            {enabledCount}/{parents.length}
          </span>
        )}
      </h3>
      <div className="space-y-3">
        {parents.map((p) => {
          const link = p.students.find((sp) => sp.studentId === student.id);
          const isEnabled = parentStates[p.id] ?? p.smsEnabled;
          const isToggling = toggling[p.id];
          const isSending = sending[p.id];
          return (
            <div key={p.id} className="rounded-xl border border-border bg-white p-4 transition hover:shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-navy">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">{p.fullName}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy/70">
                    {relationshipLabel(link?.role)}
                  </span>
                </div>
                {p.phone ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-muted'}`}>
                    {isEnabled ? <><ShieldCheck className="h-3 w-3" /> SMS On</> : <><ShieldOff className="h-3 w-3" /> SMS Off</>}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-muted">
                    <UserX className="h-3 w-3" /> No phone
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
                {p.phone && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <Phone className="h-3.5 w-3.5 text-muted" />
                    <span className="font-medium text-navy">{p.phone}</span>
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <User className="h-3.5 w-3.5 text-muted" />
                    <span className="truncate font-medium text-navy">{p.email}</span>
                  </div>
                )}
                {!p.phone && !p.email && (
                  <p className="py-2 text-center text-xs text-muted">No contact information recorded.</p>
                )}
              </div>

              {p.phone && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(p.id, isEnabled)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                      isEnabled
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-muted hover:bg-slate-200'
                    }`}
                  >
                    {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : isEnabled ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                    {isToggling ? 'Updating…' : isEnabled ? 'SMS Enabled' : 'Enable SMS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowComposer(showComposer === p.id ? null : p.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-navy/5 px-3 py-1.5 text-[11px] font-semibold text-navy hover:bg-navy/10 transition"
                  >
                    <MessageSquare className="h-3 w-3" /> Send SMS
                  </button>
                </div>
              )}

              {showComposer === p.id && p.phone && (
                <div className="mt-3 rounded-lg border border-border bg-slate-50 p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted">Direct SMS to {p.fullName}</p>
                  <textarea
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    rows={3}
                    placeholder={`Dear ${p.fullName}, regarding ${student.fullName}…`}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy outline-none focus:border-primary resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSending || !smsBody.trim()}
                      onClick={() => handleSendDirect(p)}
                      className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-navy-light disabled:opacity-50"
                    >
                      {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      {isSending ? 'Sending…' : 'Send'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowComposer(null); setSmsBody(''); }}
                      className="text-[11px] font-medium text-muted hover:text-navy transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {parents.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-muted/40" />
            <p className="text-sm text-muted">No parent contacts recorded for this student.</p>
          </div>
        )}
      </div>

      {parents.some((p) => p.phone) && (
        <a
          href={`/super-admin/sms-bulk/send?student=${encodeURIComponent(student.fullName)}&code=${encodeURIComponent(student.studentCode)}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light"
        >
          <Send className="h-4 w-4" /> Send Bulk SMS to All Parents
        </a>
      )}
    </div>
  );
}

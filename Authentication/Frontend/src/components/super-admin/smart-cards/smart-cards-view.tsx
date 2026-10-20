'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, CreditCard, FileImage, FileText, FileType, Loader2, Package, Search, Square } from 'lucide-react';
import {
  SchoolListEmptyState,
  SchoolListItem,
  SmartAccessSchoolToolbar,
  type SchoolFilterValues,
} from '@/components/super-admin/smart-access/smart-access-school-toolbar';
import {
  fetchSmartAccessSchools,
  fetchSmartAccessStaff,
  fetchSmartAccessStudents,
  type SmartAccessSchool,
  type SmartAccessStaff,
  type SmartAccessStudent,
} from '@/lib/smart-access-api';
import {
  buildCardPayload,
  canvasToBlob,
  canvasToPdfBlob,
  cardFilename,
  downloadBlob,
  exportZip,
  renderSmartCardToCanvas,
  CARD_W,
  CARD_H,
  type CardKind,
} from '@/lib/smart-card-renderer';
import { staffSourceLabel } from '@/lib/staff-source-label';

type Person = SmartAccessStudent | SmartAccessStaff;

const EMPTY_FILTERS: SchoolFilterValues = {
  provinceId: '',
  districtId: '',
  sectorId: '',
  search: '',
};

function CardPreview({
  school,
  kind,
  person,
}: {
  school: SmartAccessSchool;
  kind: CardKind;
  person: Person;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const payload = buildCardPayload(kind, school, person);
    void renderSmartCardToCanvas(payload)
      .then((canvas) => {
        if (cancelled) return;
        setPreviewUrl(canvas.toDataURL('image/png'));
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [school, kind, person]);

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden shadow-xl ring-1 ring-black/10">
        {rendering ? (
          <div
            className="flex items-center justify-center bg-white"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : previewUrl ? (
          <img src={previewUrl} alt="ID card preview" className="block h-auto w-full" />
        ) : (
          <div
            className="flex items-center justify-center bg-white text-sm text-muted"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          >
            Preview unavailable
          </div>
        )}
      </div>
    </div>
  );
}

export function SmartCardsView() {
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<SmartAccessSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SmartAccessSchool | null>(null);
  const [kind, setKind] = useState<CardKind>('student');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [students, setStudents] = useState<SmartAccessStudent[]>([]);
  const [staff, setStaff] = useState<SmartAccessStaff[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);

  const hasFilters = Boolean(
    appliedFilters.provinceId ||
      appliedFilters.districtId ||
      appliedFilters.sectorId ||
      appliedFilters.search.trim()
  );

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const rows = await fetchSmartAccessSchools({
        provinceId: appliedFilters.provinceId || undefined,
        districtId: appliedFilters.districtId || undefined,
        sectorId: appliedFilters.sectorId || undefined,
        search: appliedFilters.search.trim() || undefined,
      });
      setSchools(rows);
      setSelectedSchool((prev) => {
        if (prev && rows.some((s) => s.id === prev.id)) return prev;
        return rows[0] ?? null;
      });
    } catch {
      setSchools([]);
      setSelectedSchool(null);
    } finally {
      setLoadingSchools(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    if (!selectedSchool) {
      setStudents([]);
      setStaff([]);
      setSelectedPersonId('');
      setSelectedIds(new Set());
      return;
    }
    (async () => {
      setLoadingPeople(true);
      try {
        if (kind === 'student') {
          const rows = await fetchSmartAccessStudents(selectedSchool.id, { search: peopleSearch || undefined });
          setStudents(rows);
          setSelectedPersonId(rows[0]?.id ?? '');
        } else {
          const rows = await fetchSmartAccessStaff(selectedSchool.id, { search: peopleSearch || undefined });
          setStaff(rows);
          setSelectedPersonId(rows[0]?.id ?? '');
        }
        setSelectedIds(new Set());
      } catch {
        setStudents([]);
        setStaff([]);
        setSelectedPersonId('');
        setSelectedIds(new Set());
      } finally {
        setLoadingPeople(false);
      }
    })();
  }, [selectedSchool, kind, peopleSearch]);

  const people = useMemo(() => {
    const list = kind === 'student' ? students : staff;
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [kind, students, staff]);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? people[0] ?? null;
  const allSelected = people.length > 0 && people.every((p) => selectedIds.has(p.id));

  function togglePerson(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(people.map((p) => p.id)));
  }

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

  async function renderPersonCard(person: Person) {
    if (!selectedSchool) throw new Error('No school selected');
    const payload = buildCardPayload(kind, selectedSchool, person);
    return renderSmartCardToCanvas(payload);
  }

  async function exportSingle(format: 'png' | 'jpeg' | 'pdf') {
    if (!selectedPerson || !selectedSchool) return;
    setExporting(true);
    try {
      const canvas = await renderPersonCard(selectedPerson);
      const payload = buildCardPayload(kind, selectedSchool, selectedPerson);
      const base = cardFilename(payload).replace(/\.png$/, '');
      if (format === 'pdf') {
        downloadBlob(canvasToPdfBlob(canvas), `${base}.pdf`);
      } else {
        const blob = await canvasToBlob(canvas, format === 'jpeg' ? 'image/jpeg' : 'image/png');
        downloadBlob(blob, `${base}.${format}`);
      }
    } finally {
      setExporting(false);
    }
  }

  async function exportBulkZip() {
    if (!selectedSchool) return;
    const targets = people.filter((p) => selectedIds.has(p.id));
    if (targets.length === 0) return;

    setExporting(true);
    setExportProgress({ done: 0, total: targets.length });
    try {
      const items: Array<{ filename: string; canvas: HTMLCanvasElement }> = [];
      for (let i = 0; i < targets.length; i += 1) {
        const person = targets[i];
        const canvas = await renderPersonCard(person);
        const payload = buildCardPayload(kind, selectedSchool, person);
        items.push({ filename: cardFilename(payload), canvas });
        setExportProgress({ done: i + 1, total: targets.length });
      }
      const zipName = `${kind}-cards-${selectedSchool.name.replace(/\s+/g, '-').slice(0, 40)}.zip`;
      await exportZip(items, zipName);
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Smart Cards</h1>
        <p className="mt-1 text-sm text-muted">
          Preview and export student and staff ID cards. Assign Digital IDs in Smart Access before printing.
        </p>
      </div>

      <SmartAccessSchoolToolbar
        values={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={applyFilters}
        loading={loadingSchools}
        resultCount={schools.length}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-slate-50/80 px-4 py-3">
            <p className="font-semibold text-navy">Schools</p>
            <p className="text-xs text-muted">{loadingSchools ? 'Loading…' : `${schools.length} found`}</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-3">
            {loadingSchools ? (
              <div className="flex justify-center py-10 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : schools.length === 0 ? (
              <SchoolListEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
            ) : (
              <div className="space-y-2">
                {schools.map((school) => (
                  <SchoolListItem
                    key={school.id}
                    school={school}
                    selected={selectedSchool?.id === school.id}
                    onSelect={() => setSelectedSchool(school)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {!selectedSchool ? (
            <div className="flex min-h-[520px] items-center justify-center p-8 text-center text-sm text-muted">
              Select a school to browse students or staff.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setKind('student')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      kind === 'student' ? 'bg-white text-navy shadow-sm' : 'text-muted'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind('staff')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      kind === 'staff' ? 'bg-white text-navy shadow-sm' : 'text-muted'
                    }`}
                  >
                    Staff
                  </button>
                </div>
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search by name or code…"
                    className="input w-full pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-navy hover:text-primary"
                  disabled={people.length === 0}
                >
                  {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {allSelected ? 'Clear selection' : 'Select all'}
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-muted">{selectedIds.size} selected</span>
                )}
              </div>

              {loadingPeople ? (
                <div className="flex justify-center py-16 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : people.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted">
                  {kind === 'staff'
                    ? 'No staff found in HR, Users & Access, or Timetable for this school.'
                    : 'No students found for this school.'}
                </div>
              ) : (
                <div className="max-h-[440px] overflow-y-auto">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className={`flex items-center gap-3 border-b border-border/60 px-4 py-3 transition hover:bg-navy/[0.03] ${
                        selectedPerson?.id === person.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePerson(person.id)}
                        className="shrink-0 text-navy hover:text-primary"
                      >
                        {selectedIds.has(person.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4 text-muted" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPersonId(person.id)}
                        className="flex min-w-0 flex-1 items-center justify-between text-left"
                      >
                        <div>
                          <p className="font-medium text-navy">{person.fullName}</p>
                          <p className="text-xs text-muted">
                            {kind === 'student'
                              ? (person as SmartAccessStudent).studentCode
                              : `${(person as SmartAccessStaff).employeeNumber}${
                                  (person as SmartAccessStaff).source
                                    ? ` · ${staffSourceLabel((person as SmartAccessStaff).source)}`
                                    : ''
                                }`}
                          </p>
                        </div>
                        <CreditCard className="h-4 w-4 shrink-0 text-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          {selectedSchool && selectedPerson ? (
            <>
              <CardPreview school={selectedSchool} kind={kind} person={selectedPerson} />

              <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-slate-50/80 to-primary/5 p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  Export card
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { format: 'png' as const, label: 'PNG', icon: FileImage },
                      { format: 'jpeg' as const, label: 'JPEG', icon: FileType },
                      { format: 'pdf' as const, label: 'PDF', icon: FileText },
                    ] as const
                  ).map(({ format, label, icon: Icon }) => (
                    <button
                      key={format}
                      type="button"
                      disabled={exporting}
                      onClick={() => void exportSingle(format)}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-white px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-navy shadow-[0_1px_2px_rgba(0,4,53,0.04)] transition hover:border-primary/45 hover:bg-primary/5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy/[0.04] text-navy transition group-hover:bg-primary/15 group-hover:text-[#946207]">
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="my-3 h-px bg-border/70" />

                <button
                  type="button"
                  disabled={exporting || selectedIds.size === 0}
                  onClick={() => void exportBulkZip()}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-navy px-4 py-3.5 text-sm font-semibold text-primary shadow-[0_10px_24px_-12px_rgba(0,4,53,0.55)] transition hover:bg-navy-light hover:shadow-[0_14px_28px_-12px_rgba(0,4,53,0.6)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                  {selectedIds.size > 0 ? `Download ZIP (${selectedIds.size})` : 'Select rows for bulk ZIP'}
                </button>
              </div>
              {exportProgress && (
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round((exportProgress.done / exportProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted">
                    Rendering {exportProgress.done} / {exportProgress.total}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
              Select a school and person to preview a card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

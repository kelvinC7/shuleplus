'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckSquare,
  Eye,
  FileImage,
  FileText,
  FileType,
  Loader2,
  MoreHorizontal,
  Printer,
  ListOrdered,
  RefreshCw,
  Search,
  Square,
  User,
} from 'lucide-react';
import { CardRecordAvatar } from '@/components/card-record-avatar';
import { PrintPreviewModal } from '@/components/print-preview-modal';
import { PrintConfirmModal } from '@/components/print-confirm-modal';
import { ReprintRequestModal } from '@/components/reprint-request-modal';
import {
  cancelPrintBatch,
  cardAction,
  cardStatusLabel,
  cardStatusTone,
  confirmPrintBatch,
  createPrintBatch,
  fetchPrintBatch,
  fetchPrintQueue,
  fetchSchoolClasses,
  fetchSchools,
  fetchStaff,
  fetchStats,
  fetchStudents,
  formatPrintDate,
  removeBatchItem,
  startPrintBatch,
  type CardRecord,
  type CardStats,
  type CardStatus,
  type PersonKind,
  type PrintBatch,
  type PrintCardClass,
  type PrintCardSchool,
} from '@/services/print-card-api';
import {
  openPrintWindowPlaceholder,
  printBatchCards,
  renderRecordPreview,
  type PrintSheetLayout,
} from '@/lib/print-workflow';
import { buildPayloadFromRecord } from '@/lib/card-payload';
import { setStoredSchoolId, getStoredSchoolId } from '@/lib/selected-school-store';
import {
  clearPendingPrintConfirm,
  readPendingPrintConfirm,
  savePendingPrintConfirm,
} from '@/lib/pending-print-confirm';
import {
  canvasToBlob,
  canvasToPdfBlob,
  cardFilename,
  downloadBlob,
  exportZip,
  renderSmartCardToCanvas,
} from '@/lib/smart-card-renderer';
import {
  PrintCardSchoolToolbar,
  SchoolListEmptyState,
  SchoolListItem,
  type SchoolFilterValues,
} from '@/components/school-toolbar/school-toolbar';
import { useAuth } from '@/contexts/auth-context';
import { StatCard } from '@/components/stat-card';
import { CardRecordSearchPicker } from '@/components/card-record-search-picker';
import { PrintSelectionBar } from '@/components/print-selection-bar';

const EMPTY_FILTERS: SchoolFilterValues = {
  provinceId: '',
  districtId: '',
  sectorId: '',
  search: '',
};

const STATUS_OPTIONS: { value: CardStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'NOT_PRINTED', label: 'Not Printed' },
  { value: 'PRINTED', label: 'Printed' },
  { value: 'REPRINT_REQUIRED', label: 'Reprint Requested' },
  { value: 'REPRINTED', label: 'Reprinted' },
  { value: 'PRINTING', label: 'Printing' },
];

type PhotoFilter = '' | 'with' | 'without';

const PHOTO_FILTER_OPTIONS: { value: PhotoFilter; label: string }[] = [
  { value: '', label: 'All photos' },
  { value: 'with', label: 'Has profile photo' },
  { value: 'without', label: 'No profile photo' },
];

function isAlreadyPrinted(status: CardStatus) {
  return status === 'PRINTED' || status === 'REPRINTED';
}

function PreviewDrawer({
  record,
  kind,
  school,
  onClose,
}: {
  record: CardRecord;
  kind: PersonKind;
  school: PrintCardSchool;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void renderRecordPreview(record, kind, school).then(setUrl);
  }, [record, kind, school]);

  async function exportCard(format: 'png' | 'jpeg' | 'pdf') {
    setExporting(true);
    try {
      const payload = buildPayloadFromRecord(record, kind, school);
      const canvas = await renderSmartCardToCanvas(payload);
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

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-border bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-semibold text-navy">Card Preview</p>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-navy">
          Close
        </button>
      </div>
      <div className="p-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={record.fullName} className="mx-auto w-full max-w-[320px] shadow-lg" />
        ) : (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-slate-50/80 to-primary/5 p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Export card</p>
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
                onClick={() => void exportCard(format)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-white px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-navy shadow-sm transition hover:border-primary/45 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy/[0.04] text-navy transition group-hover:bg-primary/15">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Name</dt><dd className="font-medium">{record.fullName}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">ID</dt><dd className="font-mono">{record.personCode}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Status</dt><dd>{cardStatusLabel(record.status)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Print count</dt><dd>{record.printCount}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Last printed</dt><dd>{formatPrintDate(record.lastPrintedAt)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function ProductionView({ kind }: { kind: PersonKind }) {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<PrintCardSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<PrintCardSchool | null>(null);
  const [records, setRecords] = useState<CardRecord[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectCount, setSelectCount] = useState('9');
  const [search, setSearch] = useState('');
  const initialStatus = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState<CardStatus | ''>(
    initialStatus && STATUS_OPTIONS.some((o) => o.value === initialStatus)
      ? (initialStatus as CardStatus)
      : ''
  );
  const [classFilter, setClassFilter] = useState('');
  const [classOptions, setClassOptions] = useState<PrintCardClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('');
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<CardRecord | null>(null);
  const [activeBatch, setActiveBatch] = useState<PrintBatch | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
  const [reprintRecord, setReprintRecord] = useState<CardRecord | null>(null);
  const [confirmingPrint, setConfirmingPrint] = useState(false);
  const resumedBatchRef = useRef<string | null>(null);
  const pendingConfirmCheckedRef = useRef<string | null>(null);

  const canSelectSchools = session?.canSelectSchools ?? session?.isSuperAdmin ?? false;

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const rows = await fetchSchools({
        provinceId: appliedFilters.provinceId || undefined,
        districtId: appliedFilters.districtId || undefined,
        sectorId: appliedFilters.sectorId || undefined,
        search: appliedFilters.search.trim() || undefined,
      });
      setSchools(rows);
      const storedId = getStoredSchoolId();
      setSelectedSchool((prev) => {
        if (prev && rows.some((s) => s.id === prev.id)) return prev;
        if (storedId && rows.some((s) => s.id === storedId)) {
          return rows.find((s) => s.id === storedId) ?? rows[0] ?? null;
        }
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
    if (selectedSchool) setStoredSchoolId(selectedSchool.id);
  }, [selectedSchool]);

  useEffect(() => {
    setClassFilter('');
    setClassOptions([]);
    if (!selectedSchool || kind !== 'STUDENT') return;
    let cancelled = false;
    setLoadingClasses(true);
    void fetchSchoolClasses(selectedSchool.id)
      .then((rows) => {
        if (!cancelled) setClassOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setClassOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSchool, kind]);

  useEffect(() => {
    const batchId = searchParams.get('batch');
    const schoolId = searchParams.get('school');
    if (!batchId || !schoolId || schools.length === 0) return;
    if (resumedBatchRef.current === batchId) return;
    const school = schools.find((s) => s.id === schoolId);
    if (!school) return;
    resumedBatchRef.current = batchId;
    setSelectedSchool(school);
    void fetchPrintBatch(batchId, schoolId).then((batch) => {
      if (batch.personKind !== kind) {
        const target = batch.personKind === 'STUDENT' ? 'students' : 'staff';
        router.replace(`/cards/${target}?batch=${batchId}&school=${schoolId}`);
        return;
      }
      setActiveBatch(batch);
      setShowPreview(true);
    });
  }, [searchParams, schools, kind, router]);

  const selectedClass = useMemo(
    () => classOptions.find((c) => c.id === classFilter) ?? null,
    [classOptions, classFilter]
  );

  const loadRecords = useCallback(async () => {
    if (!selectedSchool) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (photoFilter === 'with') params.hasPhoto = 'true';
      else if (photoFilter === 'without') params.hasPhoto = 'false';
      if (kind === 'STUDENT') {
        if (selectedClass) {
          params.classId = selectedClass.id;
          params.className = selectedClass.label;
          params.classExact = 'true';
        }
        if (levelFilter) params.educationLevel = levelFilter;
      } else if (roleFilter) {
        params.role = roleFilter;
      }
      const rows =
        kind === 'STUDENT'
          ? await fetchStudents(selectedSchool.id, params)
          : await fetchStaff(selectedSchool.id, params);
      setRecords(rows);
      const st = await fetchStats(selectedSchool.id, kind);
      setStats(st);
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : e instanceof Error
            ? e.message
            : 'Failed to load cards';
      setRecordsError(msg ?? 'Failed to load cards from linked modules');
      setRecords([]);
      setStats(null);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedSchool, kind, search, statusFilter, photoFilter, selectedClass, levelFilter, roleFilter]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    setSelectedIds(new Set());
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!selectedSchool || showConfirm) return;
    const scopeKey = `${selectedSchool.id}:${kind}`;
    if (pendingConfirmCheckedRef.current === scopeKey) return;

    void (async () => {
      async function restorePendingBatch(batchId: string) {
        const batch = await fetchPrintBatch(batchId, selectedSchool!.id);
        if (batch.personKind !== kind) return;
        if (batch.status === 'PRINTING') {
          setActiveBatch(batch);
          setShowConfirm(true);
          pendingConfirmCheckedRef.current = scopeKey;
          return;
        }
        if (batch.status === 'COMPLETED' || batch.status === 'PARTIAL' || batch.status === 'CANCELLED') {
          clearPendingPrintConfirm();
        }
      }

      const pending = readPendingPrintConfirm();
      if (pending?.schoolId === selectedSchool.id && pending.personKind === kind) {
        await restorePendingBatch(pending.batchId);
        return;
      }

      const queue = await fetchPrintQueue(selectedSchool.id);
      const inFlight = queue.find((b) => b.personKind === kind && b.status === 'PRINTING');
      if (inFlight) {
        savePendingPrintConfirm({
          batchId: inFlight.id,
          schoolId: selectedSchool.id,
          personKind: kind,
        });
        await restorePendingBatch(inFlight.id);
      }
    })().catch(() => {
      /* ignore recovery errors */
    });
  }, [selectedSchool, kind, showConfirm]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, search: draftFilters.search }));
    }, 350);
    return () => window.clearTimeout(t);
  }, [draftFilters.search]);

  const visibleRecords = useMemo(() => [...records].sort((a, b) => a.fullName.localeCompare(b.fullName)), [records]);
  const unprintedVisible = useMemo(
    () => visibleRecords.filter((r) => !isAlreadyPrinted(r.status)),
    [visibleRecords]
  );
  const parsedSelectCount = Number.parseInt(selectCount, 10);
  const selectNextCount =
    Number.isFinite(parsedSelectCount) && parsedSelectCount > 0 ? parsedSelectCount : 0;
  const allVisibleSelected = visibleRecords.length > 0 && visibleRecords.every((r) => selectedIds.has(r.id));
  const selectedRecords = visibleRecords.filter((r) => selectedIds.has(r.id));
  const alreadyPrintedSelected = selectedRecords.filter((r) => isAlreadyPrinted(r.status)).length;

  const statsWithSelected = stats
    ? { ...stats, selected: selectedIds.size }
    : { total: 0, notPrinted: 0, printed: 0, reprintRequired: 0, reprinted: 0, selected: selectedIds.size };

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addToSelection(record: CardRecord) {
    setSelectedIds((prev) => {
      if (prev.has(record.id)) return prev;
      const next = new Set(prev);
      next.add(record.id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleRecords.map((r) => r.id)));
  }

  function selectNextBatch(mode: 'skip-printed' | 'include-printed') {
    if (selectNextCount <= 0) return;
    const pool = mode === 'skip-printed' ? unprintedVisible : visibleRecords;
    setSelectedIds(new Set(pool.slice(0, selectNextCount).map((r) => r.id)));
  }

  async function handlePrintSelected(asReprint = false) {
    if (!selectedSchool || selectedIds.size === 0) return;
    if (!asReprint && alreadyPrintedSelected > 0) {
      const ok = window.confirm(
        `${alreadyPrintedSelected} selected card(s) were already printed. Continue as reprint?`
      );
      if (!ok) return;
      asReprint = true;
    }
    try {
      const batch = await createPrintBatch({
        organizationId: selectedSchool.id,
        personKind: kind,
        cardRecordIds: [...selectedIds],
        asReprint,
      });
      setActiveBatch(batch);
      setShowPreview(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create print batch');
    }
  }

  async function handleStartPrint(
    layout: PrintSheetLayout,
    setProgress?: (message: string | null) => void,
  ) {
    if (!activeBatch || !selectedSchool) return;

    // Must open window synchronously on click or browsers block the print dialog.
    const printWindow = openPrintWindowPlaceholder();
    if (!printWindow) {
      alert('Pop-up blocked. Allow pop-ups for printcard.shuleplus.rw, then click Print again.');
      return;
    }

    setPrinting(true);
    setProgress?.('Starting print batch…');
    try {
      await startPrintBatch(activeBatch.id, selectedSchool.id);
      await printBatchCards(activeBatch, selectedSchool, kind, layout, printWindow, (done, total) => {
        setProgress?.(`Rendering card ${done} of ${total}…`);
      });
      setShowPreview(false);
      savePendingPrintConfirm({
        batchId: activeBatch.id,
        schoolId: selectedSchool.id,
        personKind: kind,
      });
      setShowConfirm(true);
    } catch (e) {
      try {
        printWindow.close();
      } catch {
        /* ignore */
      }
      alert(e instanceof Error ? e.message : 'Print failed');
    } finally {
      setPrinting(false);
      setProgress?.(null);
    }
  }

  async function handleRemoveBatchItem(itemId: string) {
    if (!activeBatch || !selectedSchool) return;
    try {
      const updated = await removeBatchItem(activeBatch.id, itemId, selectedSchool.id);
      if (!updated.items?.length) {
        setShowPreview(false);
        setActiveBatch(null);
        return;
      }
      setActiveBatch(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove card from batch');
    }
  }

  async function finishConfirm(allSuccess: boolean, items?: Array<{ itemId: string; success: boolean }>) {
    if (!activeBatch || !selectedSchool || confirmingPrint) return;
    setConfirmingPrint(true);
    try {
      await confirmPrintBatch(activeBatch.id, {
        organizationId: selectedSchool.id,
        allSuccess,
        items,
      });
      clearPendingPrintConfirm();
      pendingConfirmCheckedRef.current = null;
      setShowConfirm(false);
      setActiveBatch(null);
      setSelectedIds(new Set());
      void loadRecords();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save print results — try again');
    } finally {
      setConfirmingPrint(false);
    }
  }

  async function handleCardMenuAction(record: CardRecord, action: string) {
    if (!selectedSchool) return;
    setMenuId(null);
    if (action === 'preview') {
      setPreviewRecord(record);
      return;
    }
    if (action === 'print') {
      setSelectedIds(new Set([record.id]));
      void handlePrintSelected(record.status === 'PRINTED' || record.status === 'REPRINTED');
      return;
    }
    if (action === 'damaged' || action === 'lost') {
      await cardAction(record.id, selectedSchool.id, action === 'damaged' ? 'MARK_DAMAGED' : 'MARK_LOST');
      void loadRecords();
    }
    if (action === 'reprint') {
      setReprintRecord(record);
    }
  }

  async function exportBulkZip() {
    if (!selectedSchool || selectedRecords.length === 0) return;
    setExporting(true);
    setExportProgress({ done: 0, total: selectedRecords.length });
    try {
      const items: Array<{ filename: string; canvas: HTMLCanvasElement }> = [];
      for (let i = 0; i < selectedRecords.length; i += 1) {
        const record = selectedRecords[i];
        const payload = buildPayloadFromRecord(record, kind, selectedSchool);
        const canvas = await renderSmartCardToCanvas(payload);
        items.push({ filename: cardFilename(payload), canvas });
        setExportProgress({ done: i + 1, total: selectedRecords.length });
      }
      const zipName = `${kind.toLowerCase()}-cards-${selectedSchool.name.replace(/\s+/g, '-').slice(0, 40)}.zip`;
      await exportZip(items, zipName);
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  return (
    <div className="space-y-5">
      {canSelectSchools && (
        <PrintCardSchoolToolbar
          values={draftFilters}
          onChange={(patch) => setDraftFilters((p) => ({ ...p, ...patch }))}
          onApply={() => setAppliedFilters({ ...draftFilters })}
          loading={loadingSchools}
          resultCount={schools.length}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Cards" value={statsWithSelected.total} />
        <StatCard label="Not Printed" value={statsWithSelected.notPrinted} accent="text-slate-600" />
        <StatCard label="Printed" value={statsWithSelected.printed} accent="text-emerald-700" />
        <StatCard label="Selected" value={statsWithSelected.selected} accent="text-primary" />
        <StatCard label="Need Reprint" value={statsWithSelected.reprintRequired} accent="text-amber-700" />
      </div>

      {recordsError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Could not load cards from linked modules</p>
            <p className="mt-1 text-amber-900/90">{recordsError}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-navy">{kind === 'STUDENT' ? 'Students' : 'Staff'}</h1>
        <p className="mt-1 text-sm text-muted">
          {kind === 'STUDENT'
            ? 'Select student cards to print, export, or request reprints.'
            : 'Select staff cards to print, export, or request reprints.'}
          {!canSelectSchools && selectedSchool && (
            <span className="ml-1 font-medium text-navy">· {selectedSchool.name}</span>
          )}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        {canSelectSchools && (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-navy">School</p>
            </div>
            <div className="max-h-[480px] overflow-y-auto p-2">
              {loadingSchools ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : schools.length === 0 ? (
                <SchoolListEmptyState hasFilters={Boolean(appliedFilters.search)} onClearFilters={() => setDraftFilters(EMPTY_FILTERS)} />
              ) : (
                schools.map((s) => (
                  <SchoolListItem
                    key={s.id}
                    school={s}
                    selected={selectedSchool?.id === s.id}
                    onSelect={() => setSelectedSchool(s)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <CardRecordSearchPicker
            schoolId={selectedSchool?.id}
            kind={kind}
            selectedIds={selectedIds}
            onAdd={addToSelection}
            classId={kind === 'STUDENT' ? classFilter || undefined : undefined}
          />

        <div
          className={`overflow-hidden rounded-2xl border border-border bg-white shadow-sm ${selectedIds.size > 0 ? 'pb-20 sm:pb-0' : ''}`}
        >
          <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
            <label className="min-w-[160px] flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase text-muted">Search</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder={kind === 'STUDENT' ? 'Name or ID…' : 'Staff name or ID…'} />
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-muted">Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CardStatus | '')} className="input">
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-muted">Profile photo</span>
              <select
                value={photoFilter}
                onChange={(e) => setPhotoFilter(e.target.value as PhotoFilter)}
                className="input"
              >
                {PHOTO_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {kind === 'STUDENT' ? (
              <>
                <label className="min-w-[160px] space-y-1">
                  <span className="text-[11px] font-bold uppercase text-muted">Class</span>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="input"
                    disabled={!selectedSchool || loadingClasses}
                  >
                    <option value="">
                      {loadingClasses
                        ? 'Loading classes…'
                        : classOptions.length
                          ? 'All classes'
                          : 'No classes found'}
                    </option>
                    {classOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold uppercase text-muted">Education Level</span>
                  <input value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="input" placeholder="e.g. Upper Primary" />
                </label>
              </>
            ) : (
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-muted">Role</span>
                <input value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input" placeholder="Role…" />
              </label>
            )}
          </div>

          {selectedIds.size === 0 && (
            <div className="border-b border-dashed border-border bg-slate-50/80 px-4 py-3 text-center text-sm text-muted">
              Search or tick rows below, use <span className="font-semibold text-navy">Find &amp; add</span>, then{' '}
              <span className="font-semibold text-navy">Print</span> from the selection bar.
            </div>
          )}

          <PrintSelectionBar
            kind={kind}
            count={selectedIds.size}
            records={selectedRecords}
            alreadyPrintedCount={alreadyPrintedSelected}
            exporting={exporting}
            onPrint={() => void handlePrintSelected()}
            onExportZip={() => void exportBulkZip()}
            onClear={() => setSelectedIds(new Set())}
            onRemove={toggleRow}
          />

          {exportProgress && (
            <div className="border-b border-border bg-white px-4 py-2">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>Building ZIP…</span>
                <span>{exportProgress.done} / {exportProgress.total}</span>
              </div>
              <div className="h-2 overflow-hidden bg-slate-100">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(exportProgress.done / exportProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/60 px-4 py-3">
            <button
              type="button"
              onClick={toggleAllVisible}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy shadow-sm transition hover:bg-slate-50"
            >
              {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
              Select all visible
            </button>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
              <ListOrdered className="h-4 w-4 text-muted" />
              <span className="text-xs font-medium text-muted">Batch size</span>
              <input
                value={selectCount}
                onChange={(e) => setSelectCount(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') selectNextBatch('skip-printed');
                }}
                className="input w-14 py-1 text-center text-sm font-semibold"
                placeholder="9"
                inputMode="numeric"
                aria-label="Number of cards to select"
              />
              <button
                type="button"
                onClick={() => selectNextBatch('skip-printed')}
                disabled={selectNextCount <= 0 || unprintedVisible.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-45"
                title={`Select next ${selectNextCount || '…'} cards that are not printed yet`}
              >
                Skip printed
                {selectNextCount > 0 && (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{selectNextCount}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => selectNextBatch('include-printed')}
                disabled={selectNextCount <= 0 || visibleRecords.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                title={`Select next ${selectNextCount || '…'} visible cards, including already printed`}
              >
                Include printed
                {selectNextCount > 0 && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-muted">{selectNextCount}</span>
                )}
              </button>
              <span className="hidden text-[11px] text-muted lg:inline">
                {unprintedVisible.length} not printed · {visibleRecords.length} visible
              </span>
            </div>

          </div>

          {loadingRecords ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-3 w-10" />
                    <th className="px-3 py-3">Photo</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">ID Number</th>
                    {kind === 'STUDENT' ? (
                      <>
                        <th className="px-3 py-3">Class</th>
                        <th className="px-3 py-3">Education Level</th>
                      </>
                    ) : (
                      <th className="px-3 py-3">Role</th>
                    )}
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last Printed</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => (
                    <tr key={record.id} className="border-t border-border/60 hover:bg-slate-50/80">
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => toggleRow(record.id)}>
                          {selectedIds.has(record.id) ? <CheckSquare className="h-4 w-4 text-navy" /> : <Square className="h-4 w-4 text-muted" />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <CardRecordAvatar
                          fullName={record.fullName}
                          photoUrl={record.photoUrl}
                          kind={kind}
                          size="sm"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-navy">{record.fullName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{record.personCode}</td>
                      {kind === 'STUDENT' ? (
                        <>
                          <td className="px-3 py-2">{record.className ?? '—'}</td>
                          <td className="px-3 py-2">{record.educationLevel ?? '—'}</td>
                        </>
                      ) : (
                        <td className="px-3 py-2">{record.role ?? '—'}</td>
                      )}
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cardStatusTone(record.status)}`}>
                          {cardStatusLabel(record.status)}
                        </span>
                        {record.printCount > 0 && (
                          <p className="mt-0.5 text-[10px] text-muted">×{record.printCount}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">{formatPrintDate(record.lastPrintedAt)}</td>
                      <td className="relative px-3 py-2">
                        <button type="button" onClick={() => setMenuId(menuId === record.id ? null : record.id)} className="rounded p-1 hover:bg-slate-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === record.id && (
                          <div className="absolute right-2 top-10 z-10 min-w-[160px] rounded-xl border border-border bg-white py-1 shadow-lg">
                            {(
                              [
                                { key: 'preview', label: 'Preview Card', icon: Eye },
                                { key: 'print', label: 'Print Card', icon: Printer },
                                { key: 'reprint', label: 'Request Reprint', icon: RefreshCw },
                                { key: 'damaged', label: 'Mark as Damaged', icon: AlertTriangle },
                                { key: 'lost', label: 'Mark as Lost', icon: AlertTriangle },
                              ] as const
                            ).map(({ key, label, icon: Icon }) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => void handleCardMenuAction(record, key)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRecords.length === 0 && (
                <p className="py-12 text-center text-sm text-muted">No cards match your filters.</p>
              )}
            </div>
          )}

        </div>
        </div>
      </div>

      {previewRecord && selectedSchool && (
        <PreviewDrawer record={previewRecord} kind={kind} school={selectedSchool} onClose={() => setPreviewRecord(null)} />
      )}

      {selectedSchool && (
        <>
          <PrintPreviewModal
            open={showPreview}
            batch={activeBatch}
            school={selectedSchool}
            kind={kind}
            printing={printing}
            onClose={() => setShowPreview(false)}
            onPrint={(layout, setProgress) => void handleStartPrint(layout, setProgress)}
            onRemoveItem={(itemId) => void handleRemoveBatchItem(itemId)}
          />
          <ReprintRequestModal
            open={Boolean(reprintRecord)}
            record={reprintRecord}
            kind={kind}
            organizationId={selectedSchool.id}
            onClose={() => setReprintRecord(null)}
            onSubmitted={() => void loadRecords()}
          />
          <PrintConfirmModal
            open={showConfirm}
            batch={activeBatch}
            saving={confirmingPrint}
            onClose={() => setShowConfirm(false)}
            onAllSuccess={() => void finishConfirm(true)}
            onPartial={(items) => void finishConfirm(false, items)}
            onCancel={async () => {
              if (activeBatch && selectedSchool) await cancelPrintBatch(activeBatch.id, selectedSchool.id);
              clearPendingPrintConfirm();
              pendingConfirmCheckedRef.current = null;
              setShowConfirm(false);
              setActiveBatch(null);
              void loadRecords();
            }}
          />
        </>
      )}
    </div>
  );
}

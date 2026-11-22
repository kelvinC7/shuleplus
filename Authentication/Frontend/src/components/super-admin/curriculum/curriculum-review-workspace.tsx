'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Expand,
  Loader2,
  Minimize2,
  Pencil,
  RotateCcw,
  Search,
} from 'lucide-react';
import { curriculumAdminApi } from '@/lib/curriculum-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { CurriculumPageShell } from './curriculum-page-shell';
import { countLessonsWithPbAlignment } from './lesson-intelligence';
import { LessonIntelBadges, LessonIntelligencePanel } from './lesson-intelligence-panel';
import { CurriculumPairUploadModal } from './curriculum-pair-upload-modal';

type LessonNode = {
  id: string;
  lessonNumber?: string | null;
  title: string;
  suggestedPeriods?: number | null;
  extractionConfidence?: number | null;
  reviewStatus?: string;
  sourcePages?: number[];
  materials?: unknown;
  sourceContent?: unknown;
  objectives: Array<{ id?: string; statement: string }>;
};

type UnitNode = {
  id: string;
  unitNumber: string;
  title: string;
  lessons: LessonNode[];
};

type FocusPanel = 'tree' | 'edit' | 'pdf' | null;

function cleanDisplayTitle(title: string) {
  return title
    .replace(/\s*\.{2,}.*$/g, '')
    .replace(/\s+\d{1,4}\s*$/g, '')
    .replace(/^:\s*/, '')
    .trim();
}

export function CurriculumReviewWorkspace({ bookId }: { bookId: string }) {
  const toast = useToast();
  const [book, setBook] = useState<Record<string, unknown> | null>(null);
  const [units, setUnits] = useState<UnitNode[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageText, setPageText] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [restructuring, setRestructuring] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [focusPanel, setFocusPanel] = useState<FocusPanel>(null);
  const [pairUploadOpen, setPairUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, tree] = await Promise.all([
        curriculumAdminApi.getBook(bookId),
        curriculumAdminApi.getTree(bookId),
      ]);
      setBook(b);
      const u = (tree.units as UnitNode[]) ?? [];
      setUnits(u);
      setExpandedUnits((prev) => {
        const next = new Set(prev);
        u.forEach((unit) => next.add(unit.id));
        return next;
      });
      setSelectedLessonId((cur) => cur ?? u[0]?.lessons[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [bookId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!book) return;
    const s = String(book.processingStatus ?? '');
    if (s !== 'EXTRACTING' && s !== 'UPLOADED') return;
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [book, load]);

  useEffect(() => {
    let url: string | null = null;
    curriculumAdminApi
      .fetchBookPdfBlob(bookId)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => setPdfUrl(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [bookId]);

  const selectedLesson = useMemo(() => {
    for (const u of units) {
      const l = u.lessons.find((x) => x.id === selectedLessonId);
      if (l) return { unit: u, lesson: l };
    }
    return null;
  }, [units, selectedLessonId]);

  useEffect(() => {
    if (selectedLesson) {
      setEditTitle(cleanDisplayTitle(selectedLesson.lesson.title));
      const p = (selectedLesson.lesson.sourcePages?.[0] as number) ?? 1;
      setPageNumber(p);
    }
  }, [selectedLesson]);

  useEffect(() => {
    curriculumAdminApi
      .getPage(bookId, pageNumber)
      .then((p) => setPageText(p?.textContent ?? '(No text for this page)'))
      .catch(() => setPageText('Failed to load page text'));
  }, [bookId, pageNumber]);

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units
      .map((u) => ({
        ...u,
        lessons: u.lessons.filter(
          (l) =>
            cleanDisplayTitle(l.title).toLowerCase().includes(q) ||
            l.lessonNumber?.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (u) =>
          cleanDisplayTitle(u.title).toLowerCase().includes(q) ||
          u.unitNumber.includes(q) ||
          u.lessons.length > 0
      );
  }, [units, search]);

  const stats = useMemo(() => {
    const lessonCount = units.reduce((n, u) => n + u.lessons.length, 0);
    const emptyUnits = units.filter((u) => u.lessons.length === 0).length;
    const pbAlignedLessons = countLessonsWithPbAlignment(units);
    return { units: units.length, lessons: lessonCount, emptyUnits, pbAlignedLessons };
  }, [units]);

  const companion = book?.companionBook as
    | { id: string; title: string; processingStatus?: string; documentType?: string }
    | undefined
    | null;
  const extractionSummary = (book?.extractionSummary ?? {}) as {
    companionMerge?: { mergedLessonCount?: number; pbId?: string };
    extractionEngine?: string;
  };

  const saveLesson = async () => {
    if (!selectedLesson) return;
    try {
      await curriculumAdminApi.updateLesson(bookId, selectedLesson.lesson.id, { title: editTitle });
      toast.success('Lesson updated');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await curriculumAdminApi.setStatus(bookId, 'PUBLISHED');
      toast.success('Published to teachers');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const reapplyStructure = async () => {
    setRestructuring(true);
    try {
      await curriculumAdminApi.reprocess(bookId);
      toast.success('Re-extraction queued — units and lessons will refresh from the PDF');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Re-extract failed');
    } finally {
      setRestructuring(false);
    }
  };

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const expandAll = () => setExpandedUnits(new Set(units.map((u) => u.id)));
  const collapseAll = () => setExpandedUnits(new Set());

  if (loading && !book) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#000435]" size={36} />
      </div>
    );
  }

  const status = String(book?.processingStatus ?? '');
  const pageCount = Number(book?.pageCount ?? 1);

  const gridClass =
    focusPanel === 'tree'
      ? 'lg:grid-cols-12 [&>.panel-tree]:lg:col-span-12'
      : focusPanel === 'edit'
        ? 'lg:grid-cols-12 [&>.panel-edit]:lg:col-span-12'
        : focusPanel === 'pdf'
          ? 'lg:grid-cols-12 [&>.panel-pdf]:lg:col-span-12'
          : 'lg:grid-cols-12';

  const workspace = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <div className="text-slate-600">
          <p>
            <span className="font-semibold text-[#000435]">{stats.units}</span> units ·{' '}
            <span className="font-semibold text-[#000435]">{stats.lessons}</span> lessons
            {stats.pbAlignedLessons > 0 ? (
              <span className="ml-2 text-emerald-700">
                · {stats.pbAlignedLessons} with PB alignment
              </span>
            ) : null}
            {stats.emptyUnits > 0 ? (
              <span className="ml-2 text-amber-700">({stats.emptyUnits} units without lessons)</span>
            ) : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {companion ? (
              <span className="text-slate-500">
                Linked{' '}
                <span className="font-semibold text-[#000435]">
                  {companion.documentType === 'pupils_book' ? "Pupil's Book" : companion.title}
                </span>
                {extractionSummary.companionMerge?.mergedLessonCount != null ? (
                  <span className="text-emerald-700">
                    {' '}
                    · {extractionSummary.companionMerge.mergedLessonCount} lessons merged
                  </span>
                ) : null}
                {extractionSummary.extractionEngine ? (
                  <span className="text-slate-400"> · {extractionSummary.extractionEngine}</span>
                ) : null}
              </span>
            ) : (
              <span className="text-amber-800">
                No Pupil&apos;s Book linked — add PB for tools and activity alignment.
              </span>
            )}
            <button
              type="button"
              onClick={() => setPairUploadOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#FCB038]/50 bg-amber-50 px-2 py-0.5 font-semibold text-[#000435] hover:bg-amber-100"
            >
              <Pencil size={12} />
              Edit TG &amp; PB
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={expandAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Expand all
          </button>
          <button type="button" onClick={collapseAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Collapse all
          </button>
          <button
            type="button"
            disabled={restructuring || status === 'EXTRACTING'}
            onClick={() => void reapplyStructure()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw size={14} className={restructuring ? 'animate-spin' : ''} />
            Re-extract structure
          </button>
          <button
            type="button"
            onClick={() => {
              setWorkspaceExpanded((v) => !v);
              setFocusPanel(null);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-[#000435] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {workspaceExpanded ? <Minimize2 size={14} /> : <Expand size={14} />}
            {workspaceExpanded ? 'Exit full screen' : 'Full screen'}
          </button>
        </div>
      </div>

      <div
        className={`grid min-h-[640px] gap-4 ${gridClass} ${
          workspaceExpanded ? 'min-h-[calc(100vh-8rem)]' : ''
        }`}
      >
        {/* Left — tree */}
        <div
          className={`panel-tree flex flex-col rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-3 ${
            focusPanel && focusPanel !== 'tree' ? 'hidden lg:hidden' : ''
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#000435]">Units & lessons</span>
            <button type="button" className="text-[10px] font-semibold text-[#FCB038]" onClick={() => setFocusPanel(focusPanel === 'tree' ? null : 'tree')}>
              {focusPanel === 'tree' ? 'Split view' : 'Focus'}
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm"
              placeholder="Search units or lessons…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={`flex-1 overflow-auto text-sm ${workspaceExpanded ? 'max-h-[calc(100vh-14rem)]' : 'max-h-[560px]'}`}>
            {filteredUnits.map((unit) => {
              const open = expandedUnits.has(unit.id);
              return (
                <div key={unit.id} className="mb-2 border-b border-slate-100 pb-2 last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleUnit(unit.id)}
                    className="flex w-full items-start gap-1 text-left"
                  >
                    {open ? (
                      <ChevronDown size={16} className="mt-0.5 shrink-0 text-[#FCB038]" />
                    ) : (
                      <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#FCB038]">
                        Unit {unit.unitNumber}
                        <span className="ml-2 font-normal text-slate-400">({unit.lessons.length})</span>
                      </p>
                      <p className="font-semibold leading-snug text-[#000435]">{cleanDisplayTitle(unit.title)}</p>
                    </div>
                  </button>
                  {open ? (
                    <ul className="ml-5 mt-1 space-y-0.5 border-l border-slate-100 pl-2">
                      {unit.lessons.length === 0 ? (
                        <li className="px-2 py-1 text-xs text-slate-400">No lessons extracted — re-extract or add manually</li>
                      ) : (
                        unit.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedLessonId(lesson.id)}
                              className={`flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs ${
                                selectedLessonId === lesson.id ? 'bg-[#000435] text-white' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="font-mono text-[10px] opacity-80">{lesson.lessonNumber ?? '—'}</span>
                              <span className="ml-1 min-w-0 flex-1 truncate">{cleanDisplayTitle(lesson.title)}</span>
                              <LessonIntelBadges lesson={lesson} />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center — edit */}
        <div
          className={`panel-edit flex flex-col rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-5 ${
            focusPanel && focusPanel !== 'edit' ? 'hidden lg:hidden' : ''
          }`}
        >
          <div className="mb-2 flex justify-end">
            <button type="button" className="text-[10px] font-semibold text-[#FCB038]" onClick={() => setFocusPanel(focusPanel === 'edit' ? null : 'edit')}>
              {focusPanel === 'edit' ? 'Split view' : 'Focus'}
            </button>
          </div>
          {selectedLesson ? (
            <div className="flex-1 overflow-auto">
              <p className="text-xs text-slate-500">
                Unit {selectedLesson.unit.unitNumber} · {cleanDisplayTitle(selectedLesson.unit.title)}
              </p>
              <label className="mt-2 block text-xs font-semibold uppercase text-slate-500">Lesson title</label>
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <button type="button" onClick={() => void saveLesson()} className="mt-3 rounded-lg bg-[#000435] px-3 py-1.5 text-xs font-semibold text-white">
                Save lesson
              </button>
              <h3 className="mt-4 text-xs font-bold uppercase text-slate-500">Learning objectives</h3>
              {selectedLesson.lesson.objectives.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {selectedLesson.lesson.objectives.map((o) => (
                    <li key={o.statement.slice(0, 40)}>{o.statement}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No objectives extracted yet for this section.</p>
              )}
              <p className="mt-4 text-xs text-amber-800">
                Source pages: {(selectedLesson.lesson.sourcePages ?? []).join(', ') || '—'} · Confidence is a hint only.
              </p>
              <LessonIntelligencePanel lesson={selectedLesson.lesson} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a lesson from the tree.</p>
          )}
        </div>

        {/* Right — PDF */}
        <div
          className={`panel-pdf flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-4 ${
            focusPanel && focusPanel !== 'pdf' ? 'hidden lg:hidden' : ''
          }`}
        >
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
            <span className="font-bold text-[#000435]">Source PDF</span>
            <div className="flex items-center gap-2">
              <button type="button" className="text-[10px] font-semibold text-[#FCB038]" onClick={() => setFocusPanel(focusPanel === 'pdf' ? null : 'pdf')}>
                {focusPanel === 'pdf' ? 'Split' : 'Focus'}
              </button>
              <button type="button" className="rounded border px-2 py-0.5 disabled:opacity-40" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
                Prev
              </button>
              <span>
                {pageNumber}/{pageCount}
              </span>
              <button type="button" className="rounded border px-2 py-0.5 disabled:opacity-40" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
          {pdfUrl ? (
            <iframe
              title="PDF"
              src={`${pdfUrl}#page=${pageNumber}`}
              className={`w-full shrink-0 bg-slate-100 ${workspaceExpanded || focusPanel === 'pdf' ? 'h-[45vh] min-h-[320px]' : 'h-64'}`}
            />
          ) : (
            <p className="p-4 text-sm text-slate-500">PDF preview unavailable</p>
          )}
          <pre
            className={`flex-1 overflow-auto border-t p-3 text-[11px] leading-relaxed text-slate-700 ${
              workspaceExpanded || focusPanel === 'pdf' ? 'min-h-[200px] max-h-[40vh]' : 'max-h-48'
            }`}
          >
            {pageText}
          </pre>
        </div>
      </div>
    </>
  );

  return (
    <CurriculumPageShell
      title={String(book?.title ?? 'Review & Publish')}
      subtitle="Verify extracted units, lessons and source pages before teachers can use this curriculum."
      actions={
        <>
          <Link href="/super-admin/curriculum/library" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">
            Library
          </Link>
          {status !== 'PUBLISHED' && (
            <button
              type="button"
              disabled={publishing || status === 'EXTRACTING'}
              onClick={() => void publish()}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#000435] disabled:opacity-50"
              style={{ background: '#FCB038' }}
            >
              {publishing ? 'Publishing…' : 'Approve & publish'}
            </button>
          )}
        </>
      }
    >
      {pairUploadOpen ? (
        <CurriculumPairUploadModal
          bookId={bookId}
          bookTitle={String(book?.title ?? 'Curriculum book')}
          hasCompanion={Boolean(companion)}
          companionTitle={companion?.title}
          onClose={() => setPairUploadOpen(false)}
          onSuccess={() => {
            toast.success('PDF upload queued — extraction and PB merge will run shortly');
            void load();
          }}
        />
      ) : null}
      {workspaceExpanded ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-50 pt-16">
          <div className="mx-auto w-full max-w-[1600px] flex-1 overflow-auto px-4 pb-6">{workspace}</div>
        </div>
      ) : (
        workspace
      )}
    </CurriculumPageShell>
  );
}

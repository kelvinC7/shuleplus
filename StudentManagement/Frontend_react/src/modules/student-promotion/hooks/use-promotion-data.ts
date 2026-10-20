import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fetchAcademicSettings } from '@/services/api';
import type { AcademicSettings, ApiClass, Student } from '@/types';
import type { PromotionCandidate, PromotionMode, PromotionResult, PromotionStep } from '../types';
import {
  buildCandidate,
  computePromotionStats,
  getEnrollmentForYear,
  nextAcademicYear,
  resolveTargetClassForStudent,
  suggestTargetClass,
} from '../utils';
import {
  clearPromotionWorkspace,
  loadPromotionWorkspace,
  savePromotionWorkspace,
} from '../workspace-storage';

export function usePromotionData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  const [step, setStep] = useState<PromotionStep>('setup');
  const [mode, setMode] = useState<PromotionMode>('by_class');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [fromClassId, setFromClassId] = useState<string | null>(null);
  const [toClassId, setToClassId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetClassByStudent, setTargetClassByStudent] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string | null>(null);
  const [individualClassId, setIndividualClassId] = useState<string | null>(null);
  const [individualStream, setIndividualStream] = useState<string | null>(null);
  const [result, setResult] = useState<PromotionResult | null>(null);
  const [workspaceConfigured, setWorkspaceConfigured] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes, settings] = await Promise.all([
        api.get('/students'),
        api.get('/classes'),
        fetchAcademicSettings().catch(() => null),
      ]);
      setStudents(stuRes.data.data ?? []);
      setClasses(clsRes.data.data ?? []);
      setAcademicSettings(settings);

      if (settings) {
        const from = settings.currentAcademicYear ?? settings.academicYears[0] ?? '';
        const to = nextAcademicYear(from, settings.academicYears) ?? '';
        setFromYear((prev) => prev || from);
        setToYear((prev) => prev || to);
      }

      const saved = loadPromotionWorkspace();
      if (saved) {
        setFromYear(saved.fromYear);
        setToYear(saved.toYear);
        setMode(saved.mode);
        setFromClassId(saved.fromClassId);
        setToClassId(saved.toClassId);
        setSelectedIds(new Set(saved.selectedStudentIds));
        setTargetClassByStudent(saved.targetClassByStudent ?? {});
        setWorkspaceConfigured(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fromClass = useMemo(() => classes.find((c) => c.id === fromClassId) ?? null, [classes, fromClassId]);
  const toClass = useMemo(() => classes.find((c) => c.id === toClassId) ?? null, [classes, toClassId]);

  const stats = useMemo(
    () => (fromYear && toYear ? computePromotionStats(students, fromYear, toYear) : { total: 0, promoted: 0, pending: 0, notPromoted: 0 }),
    [students, fromYear, toYear]
  );

  const eligibleStudents = useMemo(() => {
    if (!fromYear) return [];
    return students.filter((s) => {
      const en = getEnrollmentForYear(s, fromYear);
      return en && en.status === 'ACTIVE';
    });
  }, [students, fromYear]);

  const classFilteredStudents = useMemo(() => {
    if (mode === 'by_class') {
      if (!fromClassId) return [];
      let list = eligibleStudents.filter((s) => {
        const en = getEnrollmentForYear(s, fromYear);
        return en?.classId === fromClassId;
      });
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(
          (s) =>
            s.firstName.toLowerCase().includes(q) ||
            s.lastName.toLowerCase().includes(q) ||
            s.studentUid.toLowerCase().includes(q) ||
            (s.studentCode ?? '').toLowerCase().includes(q)
        );
      }
      return list;
    }
    let list = eligibleStudents;
    if (filterClassId) {
      list = list.filter((s) => getEnrollmentForYear(s, fromYear)?.classId === filterClassId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.studentUid.toLowerCase().includes(q) ||
          (s.studentCode ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [mode, eligibleStudents, fromClassId, fromYear, filterClassId, searchQuery]);

  const tableStudents = useMemo(() => {
    if (classFilteredStudents.length > 0) return classFilteredStudents;
    if (workspaceConfigured && selectedIds.size > 0) {
      return students.filter((s) => selectedIds.has(s.id));
    }
    return classFilteredStudents;
  }, [classFilteredStudents, workspaceConfigured, selectedIds, students]);

  const applyDefaultTargets = useCallback(
    (studentIds: string[], sourceClass: ApiClass | null, defaultTo: ApiClass | null) => {
      if (!defaultTo) return;
      setTargetClassByStudent((prev) => {
        const next = { ...prev };
        for (const id of studentIds) {
          const student = students.find((s) => s.id === id);
          if (!student) continue;
          const en = getEnrollmentForYear(student, fromYear);
          const source = en?.class ?? sourceClass;
          if (!source) continue;
          const resolved = resolveTargetClassForStudent(source, defaultTo, classes);
          if (resolved) next[id] = resolved.id;
        }
        return next;
      });
    },
    [students, fromYear, classes]
  );

  const autoSelectClassStudents = useCallback(
    (fromId: string, toId: string) => {
      const from = classes.find((c) => c.id === fromId);
      const defaultTo = classes.find((c) => c.id === toId);
      if (!from || !defaultTo) return;
      const ids = eligibleStudents
        .filter((s) => getEnrollmentForYear(s, fromYear)?.classId === fromId)
        .map((s) => s.id);
      applyDefaultTargets(ids, from, defaultTo);
      setSelectedIds(new Set(ids));
    },
    [classes, eligibleStudents, fromYear, applyDefaultTargets]
  );

  const handleFromClassChange = useCallback(
    (classId: string | null) => {
      setFromClassId(classId);
      setSelectedIds(new Set());
      setTargetClassByStudent({});
      if (classId) {
        const from = classes.find((c) => c.id === classId);
        if (from) {
          const suggested = suggestTargetClass(from, classes);
          const nextToId = suggested?.id ?? null;
          setToClassId(nextToId);
          if (nextToId) autoSelectClassStudents(classId, nextToId);
        }
      } else {
        setToClassId(null);
      }
    },
    [classes, autoSelectClassStudents]
  );

  const handleToClassChange = useCallback(
    (classId: string | null) => {
      setToClassId(classId);
      if (classId && fromClassId) {
        autoSelectClassStudents(fromClassId, classId);
      }
    },
    [fromClassId, autoSelectClassStudents]
  );

  const setStudentTargetClass = useCallback((studentId: string, classId: string) => {
    setTargetClassByStudent((prev) => ({ ...prev, [studentId]: classId }));
  }, []);

  const toggleStudent = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(classFilteredStudents.map((s) => s.id)));
  }, [classFilteredStudents]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const applyIndividualAssignment = useCallback(() => {
    if (!individualClassId) return;
    const cls = classes.find((c) => c.id === individualClassId);
    if (!cls) return;
    let target = cls;
    if (individualStream) {
      const streamMatch = classes.find((c) => c.name === cls.name && c.stream === individualStream);
      if (streamMatch) target = streamMatch;
    }
    setTargetClassByStudent((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) next[id] = target.id;
      return next;
    });
  }, [individualClassId, individualStream, classes, selectedIds]);

  const candidates = useMemo((): PromotionCandidate[] => {
    const list: PromotionCandidate[] = [];
    for (const id of selectedIds) {
      const student = students.find((s) => s.id === id);
      if (!student) continue;
      const targetId = targetClassByStudent[id] ?? toClassId;
      const candidate = buildCandidate(student, fromYear, toYear, targetId, classes);
      if (candidate) list.push(candidate);
    }
    return list;
  }, [selectedIds, students, targetClassByStudent, toClassId, fromYear, toYear, classes]);

  const readyCount = candidates.filter((c) => !c.issue).length;
  const reviewCount = candidates.filter((c) => c.issue).length;

  const executePromotion = useCallback(async () => {
    const promotable = candidates.filter((c) => !c.issue);
    if (promotable.length === 0) return;

    setPromoting(true);
    const success: PromotionCandidate[] = [];
    const skipped: PromotionResult['skipped'] = [];
    const review: PromotionCandidate[] = [];

    for (const candidate of candidates) {
      if (candidate.issue) {
        review.push(candidate);
        continue;
      }
      try {
        await api.post('/enrollments/promote', {
          enrollmentId: candidate.enrollment.id,
          newClassId: candidate.targetClassId,
          newAcademicYear: toYear,
        });
        success.push(candidate);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Promotion failed';
        skipped.push({ candidate, reason: message });
      }
    }

    setResult({ success, skipped, review });
    setStep('result');
    setPromoting(false);
    clearPromotionWorkspace();
    setWorkspaceConfigured(false);
    await fetchData();
  }, [candidates, toYear, fetchData]);

  const resetWorkflow = useCallback(() => {
    setStep('setup');
    setResult(null);
    setSelectedIds(new Set());
    setTargetClassByStudent({});
    setFromClassId(null);
    setToClassId(null);
    setSearchQuery('');
    setFilterClassId(null);
    setWorkspaceConfigured(false);
    clearPromotionWorkspace();
  }, []);

  const handleFromYearChange = useCallback(
    (year: string) => {
      setFromYear(year);
      if (academicSettings) {
        const next = nextAcademicYear(year, academicSettings.academicYears);
        if (next) setToYear(next);
      }
      setSelectedIds(new Set());
      setFromClassId(null);
      setToClassId(null);
    },
    [academicSettings]
  );

  const applyWizardConfig = useCallback(
    (config: {
      fromYear: string;
      toYear: string;
      mode: PromotionMode;
      fromClassId: string | null;
      toClassId: string | null;
      selectedStudentIds: string[];
    }) => {
      setFromYear(config.fromYear);
      setToYear(config.toYear);
      setMode(config.mode);
      setSearchQuery('');
      setFilterClassId(null);
      setIndividualClassId(null);
      setIndividualStream(null);
      setFromClassId(config.fromClassId);
      setToClassId(config.toClassId);
      setWorkspaceConfigured(true);

      let finalIds = [...(config.selectedStudentIds ?? [])];
      let finalTargets: Record<string, string> = {};

      if (
        finalIds.length === 0 &&
        config.mode === 'by_class' &&
        config.fromClassId &&
        config.toClassId
      ) {
        finalIds = students
          .filter((s) => {
            const en = getEnrollmentForYear(s, config.fromYear);
            return en?.classId === config.fromClassId && en.status === 'ACTIVE';
          })
          .map((s) => s.id);
      }

      if (finalIds.length > 0 && config.fromClassId && config.toClassId) {
        const from = classes.find((c) => c.id === config.fromClassId) ?? null;
        const defaultTo = classes.find((c) => c.id === config.toClassId) ?? null;
        if (from && defaultTo) {
          for (const id of finalIds) {
            const student = students.find((s) => s.id === id);
            if (!student) continue;
            const en = getEnrollmentForYear(student, config.fromYear);
            const source = en?.class ?? from;
            const resolved = resolveTargetClassForStudent(source, defaultTo, classes);
            if (resolved) finalTargets[id] = resolved.id;
          }
        }
      } else if (finalIds.length > 0 && config.mode === 'select_students') {
        for (const id of finalIds) {
          const student = students.find((s) => s.id === id);
          if (!student) continue;
          const en = getEnrollmentForYear(student, config.fromYear);
          const source = en?.class;
          if (!source) continue;
          const suggested = suggestTargetClass(source, classes);
          if (suggested) finalTargets[id] = suggested.id;
        }
      }

      setSelectedIds(new Set(finalIds));
      setTargetClassByStudent(finalTargets);

      savePromotionWorkspace({
        fromYear: config.fromYear,
        toYear: config.toYear,
        mode: config.mode,
        fromClassId: config.fromClassId,
        toClassId: config.toClassId,
        selectedStudentIds: finalIds,
        targetClassByStudent: finalTargets,
        configured: true,
      });
    },
    [classes, students]
  );

  return {
    loading,
    promoting,
    step,
    setStep,
    mode,
    setMode,
    fromYear,
    toYear,
    setToYear,
    handleFromYearChange,
    fromClassId,
    toClassId,
    fromClass,
    toClass,
    handleFromClassChange,
    handleToClassChange,
    students,
    classes,
    academicSettings,
    stats,
    classFilteredStudents,
    tableStudents,
    selectedIds,
    toggleStudent,
    selectAll,
    clearSelection,
    targetClassByStudent,
    setStudentTargetClass,
    searchQuery,
    setSearchQuery,
    filterClassId,
    setFilterClassId,
    individualClassId,
    setIndividualClassId,
    individualStream,
    setIndividualStream,
    applyIndividualAssignment,
    candidates,
    readyCount,
    reviewCount,
    executePromotion,
    result,
    resetWorkflow,
    fetchData,
    applyWizardConfig,
    workspaceConfigured,
  };
}

export type PromotionData = ReturnType<typeof usePromotionData>;

import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  fetchIamOrganizationProfile,
  resolveIamAssetUrl,
} from '../clients/iam.client';
import { resolveSmAssetUrl, smListClasses, smListStudents } from '../clients/student-management.client';
import { resolveAcademicClass } from './sm-resolve.service';
import { gradingEngineService } from './grading-engine.service';
import { fetchTimetableClassCatalog } from '../clients/timetable.client';
import { findTimetableClassRow } from '../utils/report-card-course-sync';
import {
  getReportCardSettings,
  resolveVerifyBase,
  type ReportCardSettings,
} from './report-card.service';
import { normalizeReportKind, type ReportKind } from '../utils/report-kind';
import {
  DEFAULT_NURSERY_LEARNING_AREAS,
  DEFAULT_NURSERY_PERFORMANCE_BANDS,
  DEFAULT_NURSERY_TEMPLATE_SETTINGS,
  bandForNurseryPercentage,
  inferLearningArea,
  parseNurseryTemplateSettings,
  randomVerificationCode,
  validateNurseryPerformanceBands,
  validateNurseryTemplateSettings,
  type NurseryPerformanceBand,
  type NurseryTemplateSettings,
} from '../utils/nursery-settings';

const NURSERY_SCALE_NAME = 'Nursery Performance';
const FALLBACK_BAND_COLORS = ['#16A34A', '#2563EB', '#EAB308', '#DC4545', '#7C3AED', '#0891B2', '#EA580C', '#475569'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function stageNoMarksMessage(reportKind: ReportKind): string {
  if (reportKind === 'beginning') {
    return 'No beginning-term assessment marks found. Enter and classify beginning-term marks in TichaPortal first.';
  }
  if (reportKind === 'midterm') {
    return 'No mid-term assessment marks found. Enter and classify mid-term marks in TichaPortal first.';
  }
  return 'No assessment marks found for this class. Enter marks in TichaPortal first.';
}

function yearKey(value: string | undefined | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) throw new AppError(400, 'Academic year is required');
  if (!/^\d{4}(\s*[-/]\s*\d{4})?$/.test(raw)) {
    throw new AppError(400, 'Academic year must look like 2025 or 2025-2026');
  }
  return raw.replace(/\s+/g, '');
}

function termKey(value: string | undefined | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) throw new AppError(400, 'Term is required');
  if (raw.length > 60) throw new AppError(400, 'Term name is too long');
  return raw;
}

function classLabel(input: { name?: string | null; stream?: string | null; label?: string | null }): string {
  if (input.label?.trim()) return input.label.trim();
  return [input.name, input.stream].filter(Boolean).join(' ').trim() || 'Class';
}

function studentName(row: Record<string, unknown>): string {
  const full = typeof row.fullName === 'string' ? row.fullName.trim() : '';
  if (full) return full;
  const parts = [row.firstName, row.lastName]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  return parts.join(' ') || 'Student';
}

function studentCode(row: Record<string, unknown>): string | null {
  const candidates = [row.studentCode, row.studentUid, row.admissionNo];
  for (const raw of candidates) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value && !UUID_RE.test(value)) return value;
  }
  return null;
}

export type NurserySubjectConfigInput = {
  subjectId: string;
  subjectName?: string | null;
  learningArea: string;
  maxMark: number;
  isVisible: boolean;
  contributesToTotal: boolean;
  sortOrder: number;
};

type ResolvedSubject = {
  subjectId: string;
  subjectName: string;
  learningArea: string;
  maxMark: number;
  isVisible: boolean;
  contributesToTotal: boolean;
  sortOrder: number;
  configId: string | null;
};

type ComputedResult = {
  average: number | null;
  totalScore: number | null;
  totalMax: number;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    learningArea: string;
    maxMark: number;
    percentage: number | null;
    score: number | null;
    band: NurseryPerformanceBand | null;
    isVisible: boolean;
    contributesToTotal: boolean;
  }>;
};

function computeResult(
  configs: ResolvedSubject[],
  marks: Record<string, number | null> | undefined,
  bands: NurseryPerformanceBand[]
): ComputedResult {
  const visible = configs.filter((c) => c.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  let totalScore = 0;
  let totalMax = 0;
  let scoredCount = 0;

  const subjects = visible.map((config) => {
    const raw = marks?.[config.subjectId];
    const percentage = raw != null && Number.isFinite(raw) ? round2(raw) : null;
    const maxMark = Number(config.maxMark) > 0 ? Number(config.maxMark) : 100;
    const score = percentage == null ? null : round2((percentage / 100) * maxMark);
    if (config.contributesToTotal && score != null) {
      // Match the mid-term percentage: Σ marks ÷ Σ default marks for the
      // courses the learner actually has marks for. Courses without marks must
      // not drag the percentage down.
      totalMax += maxMark;
      totalScore += score;
      scoredCount += 1;
    }
    return {
      subjectId: config.subjectId,
      subjectName: config.subjectName,
      learningArea: config.learningArea,
      maxMark,
      percentage,
      score,
      band: bandForNurseryPercentage(percentage, bands),
      isVisible: config.isVisible,
      contributesToTotal: config.contributesToTotal,
    };
  });

  const average = totalMax > 0 && scoredCount > 0 ? round2((totalScore / totalMax) * 100) : null;
  return {
    average,
    totalScore: scoredCount > 0 ? round2(totalScore) : null,
    totalMax: round2(totalMax),
    subjects,
  };
}

async function loadBands(organizationId: string): Promise<NurseryPerformanceBand[]> {
  const rows = await prisma.gradingScale.findMany({
    where: { organizationId, academicLevel: 'NURSERY', name: NURSERY_SCALE_NAME },
    orderBy: { sortOrder: 'desc' },
  });
  if (!rows.length) return DEFAULT_NURSERY_PERFORMANCE_BANDS.map((b) => ({ ...b }));
  return rows
    .map((row, index) => ({
      label: row.grade,
      minPercentage: Number(row.minPercentage),
      maxPercentage: Number(row.maxPercentage),
      color:
        row.color && /^#[0-9a-f]{6}$/i.test(row.color)
          ? row.color.toUpperCase()
          : FALLBACK_BAND_COLORS[index % FALLBACK_BAND_COLORS.length],
    }))
    .sort((a, b) => b.minPercentage - a.minPercentage);
}

async function saveBands(organizationId: string, input: unknown) {
  const bands = validateNurseryPerformanceBands(input);
  await prisma.$transaction([
    prisma.gradingScale.deleteMany({
      where: { organizationId, academicLevel: 'NURSERY', name: NURSERY_SCALE_NAME },
    }),
    ...bands.map((band, index) =>
      prisma.gradingScale.create({
        data: {
          organizationId,
          name: NURSERY_SCALE_NAME,
          academicLevel: 'NURSERY',
          minPercentage: band.minPercentage,
          maxPercentage: band.maxPercentage,
          grade: band.label,
          color: band.color,
          description: 'Nursery report performance level',
          sortOrder: bands.length - index,
        },
      })
    ),
  ]);
  return bands;
}

async function loadTemplate(organizationId: string): Promise<NurseryTemplateSettings> {
  const tenant = await prisma.tenant.findUnique({
    where: { organizationId },
    select: { nurseryReportSettings: true },
  });
  const raw = tenant?.nurseryReportSettings as { template?: unknown } | null;
  return parseNurseryTemplateSettings(raw?.template);
}

async function saveTemplate(organizationId: string, input: unknown) {
  const template = validateNurseryTemplateSettings(input);
  const existing = await prisma.tenant.findUnique({
    where: { organizationId },
    select: { organizationId: true, nurseryReportSettings: true },
  });
  const previous = (existing?.nurseryReportSettings as Record<string, unknown> | null) ?? {};
  const next = { ...previous, template };
  if (existing) {
    await prisma.tenant.update({ where: { organizationId }, data: { nurseryReportSettings: next } });
  } else {
    await prisma.tenant.create({
      data: { organizationId, organizationName: 'School', nurseryReportSettings: next },
    });
  }
  return template;
}

async function loadRoster(
  organizationId: string,
  classId: string,
  className: string | null,
  academicYear: string
): Promise<Array<Record<string, unknown>>> {
  const rows = (await smListStudents(organizationId, { classId, academicYear }).catch(() => [])) as Array<
    Record<string, unknown>
  >;
  if (rows.length || !className) return Array.isArray(rows) ? rows : [];
  const byName = (await smListStudents(organizationId, { className, academicYear }).catch(() => [])) as Array<
    Record<string, unknown>
  >;
  return Array.isArray(byName) ? byName : [];
}

async function loadClassSubjects(
  organizationId: string,
  academicClassId: string,
  academicYear: string,
  term?: string
) {
  const where: Prisma.AssessmentWhereInput = {
    organizationId,
    classId: academicClassId,
    academicYear,
  };
  if (term) where.term = term;

  const [assessments, defaults] = await Promise.all([
    prisma.assessment.findMany({
      where,
      select: { subjectId: true, subject: { select: { id: true, name: true } } },
      distinct: ['subjectId'],
    }),
    prisma.courseDefaultMarks.findMany({
      where: { organizationId, classId: academicClassId, academicYear, ...(term ? { term } : {}) },
      select: { subjectId: true, subject: { select: { id: true, name: true } } },
    }),
  ]);

  // Only courses actually assigned to this class (assessments or course default
  // marks for the year/term). Never fall back to every subject in the school.
  const map = new Map<string, { id: string; name: string }>();
  for (const row of assessments) map.set(row.subjectId, { id: row.subjectId, name: row.subject.name });
  for (const row of defaults) {
    if (!map.has(row.subjectId)) map.set(row.subjectId, { id: row.subjectId, name: row.subject.name });
  }
  return map;
}

type TimetableCourseOption = {
  subjectName: string;
  courseCode: string | null;
  defaultCourseMarks: number | null;
};

function normCourseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normCourseCode(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Courses assigned to this class in Smart Timetable → Config Class for the
 * selected year/term. Nursery reports use this list as the source of truth.
 */
async function loadTimetableCourses(
  organizationId: string,
  cls: { id: string; name: string; stream?: string | null },
  academicYear: string,
  term?: string
): Promise<TimetableCourseOption[] | null> {
  try {
    const catalog = await fetchTimetableClassCatalog(organizationId, { academicYear, term });
    const row = findTimetableClassRow(catalog, {
      id: cls.id,
      name: cls.name,
      stream: cls.stream ?? null,
    });
    const seen = new Set<string>();
    const courses: TimetableCourseOption[] = [];
    for (const course of row?.courses ?? []) {
      const subjectName = String(course.subjectName ?? '').trim();
      const key = normCourseName(subjectName);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const dcm = Number(course.defaultCourseMarks);
      courses.push({
        subjectName,
        courseCode: course.courseCode?.trim() || null,
        defaultCourseMarks: Number.isFinite(dcm) && dcm > 0 ? dcm : null,
      });
    }
    return courses.length ? courses : null;
  } catch (err) {
    console.warn(
      '[nursery] Timetable Config Class courses unavailable:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function resolveSubjectConfigs(
  organizationId: string,
  classId: string,
  cls: { id: string; name: string; stream?: string | null },
  academicYear: string,
  term: string | undefined,
  datasetSubjects?: Array<{ subjectId: string; subject: string }>
): Promise<ResolvedSubject[]> {
  const [existing, classSubjects, subjects, courseDefaults, timetableCourses] = await Promise.all([
    prisma.nurserySubjectConfig.findMany({
      where: { organizationId, classId },
      orderBy: [{ sortOrder: 'asc' }, { subjectName: 'asc' }],
    }),
    loadClassSubjects(organizationId, cls.id, academicYear, term),
    prisma.subject.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true },
    }),
    prisma.courseDefaultMarks.findMany({
      where: {
        organizationId,
        classId: cls.id,
        academicYear,
        ...(term ? { term } : {}),
      },
      select: { subjectId: true, defaultCourseMarks: true },
    }),
    loadTimetableCourses(organizationId, cls, academicYear, term),
  ]);

  const defaultMarksBySubject = new Map(
    courseDefaults.map((row) => [row.subjectId, Number(row.defaultCourseMarks)])
  );

  const existingById = new Map(existing.map((row) => [row.subjectId, row]));
  const existingByName = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    const name =
      row.subjectName ||
      classSubjects.get(row.subjectId)?.name ||
      subjects.find((subject) => subject.id === row.subjectId)?.name ||
      '';
    const key = normCourseName(name);
    if (key && !existingByName.has(key)) existingByName.set(key, row);
  }

  // Primary source: Timetable → Config Class. Learning-area, maximum-mark,
  // visibility and contribution settings are reused as per-course overrides,
  // but the course list itself always comes from the timetable.
  if (timetableCourses?.length) {
    const idByName = new Map<string, string>();
    const idByCode = new Map<string, string>();
    for (const subject of subjects) {
      const nameKey = normCourseName(subject.name);
      if (nameKey && !idByName.has(nameKey)) idByName.set(nameKey, subject.id);
      const codeKey = normCourseCode(subject.code);
      if (codeKey && !idByCode.has(codeKey)) idByCode.set(codeKey, subject.id);
    }
    for (const subject of datasetSubjects ?? []) {
      const nameKey = normCourseName(subject.subject);
      if (nameKey) idByName.set(nameKey, subject.subjectId);
    }

    const resolved: ResolvedSubject[] = [];
    const seenIds = new Set<string>();
    for (const course of timetableCourses) {
      const nameKey = normCourseName(course.subjectName);
      const subjectId =
        idByName.get(nameKey) ??
        idByCode.get(normCourseCode(course.courseCode)) ??
        `tt:${course.courseCode?.trim() || nameKey.replace(/\s+/g, '-')}`;
      if (seenIds.has(subjectId)) continue;
      seenIds.add(subjectId);

      const override = existingById.get(subjectId) ?? existingByName.get(nameKey);
      const overrideMax = Number(override?.maxMark);
      const academicDefault = defaultMarksBySubject.get(subjectId);
      resolved.push({
        subjectId,
        subjectName: course.subjectName,
        learningArea: override?.learningArea?.trim() || inferLearningArea(course.subjectName),
        maxMark:
          course.defaultCourseMarks ??
          (typeof academicDefault === 'number' && academicDefault > 0
            ? academicDefault
            : Number.isFinite(overrideMax) && overrideMax > 0
              ? overrideMax
              : 100),
        isVisible: override?.isVisible ?? true,
        contributesToTotal: override?.contributesToTotal ?? true,
        sortOrder: resolved.length,
        configId: override?.id ?? null,
      });
    }
    if (resolved.length) return resolved;
  }

  // Fallback when Timetable is unreachable: use the courses that already have
  // assessments/default marks for this class, merged with any saved overrides.
  const restrictToAssigned = classSubjects.size > 0;

  const resolved = new Map<string, ResolvedSubject>();
  for (const row of existing) {
    if (restrictToAssigned && !classSubjects.has(row.subjectId)) continue;
    resolved.set(row.subjectId, {
      subjectId: row.subjectId,
      subjectName: row.subjectName || classSubjects.get(row.subjectId)?.name || 'Subject',
      learningArea: row.learningArea,
      maxMark: Number(row.maxMark),
      isVisible: row.isVisible,
      contributesToTotal: row.contributesToTotal,
      sortOrder: row.sortOrder,
      configId: row.id,
    });
  }

  let nextOrder = resolved.size ? Math.max(...[...resolved.values()].map((r) => r.sortOrder)) + 1 : 0;
  for (const subject of classSubjects.values()) {
    if (resolved.has(subject.id)) continue;
    resolved.set(subject.id, {
      subjectId: subject.id,
      subjectName: subject.name,
      learningArea: inferLearningArea(subject.name),
      maxMark: 100,
      isVisible: true,
      contributesToTotal: true,
      sortOrder: nextOrder,
      configId: null,
    });
    nextOrder += 1;
  }

  return [...resolved.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.subjectName.localeCompare(b.subjectName)
  );
}

/**
 * Keep one row per course name. When duplicate subject records share a name,
 * prefer the record that actually has marks for the selected report run.
 */
function dedupeConfigsByName(configs: ResolvedSubject[], preferredSubjectIds?: Set<string>): ResolvedSubject[] {
  const byName = new Map<string, ResolvedSubject>();
  for (const row of configs) {
    const key = row.subjectName.trim().toLowerCase();
    const current = byName.get(key);
    if (!current) {
      byName.set(key, row);
      continue;
    }
    if (
      preferredSubjectIds &&
      !preferredSubjectIds.has(current.subjectId) &&
      preferredSubjectIds.has(row.subjectId)
    ) {
      byName.set(key, row);
    }
  }
  return [...byName.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.subjectName.localeCompare(b.subjectName)
  );
}

async function getSchool(organizationId: string) {
  const [profile, settings] = await Promise.all([
    fetchIamOrganizationProfile(organizationId).catch(() => null),
    getReportCardSettings(organizationId).catch(() => ({}) as ReportCardSettings),
  ]);
  const verifyBase = resolveVerifyBase(settings.verifyBaseUrl);
  const orgCode = profile?.organizationCode ? String(profile.organizationCode) : '';
  return {
    school: {
      name: profile?.schoolName || 'School',
      logoUrl: resolveIamAssetUrl(profile?.logoUrl ?? null),
      stampUrl: resolveIamAssetUrl(profile?.stampUrl ?? null),
      signatureUrl: resolveIamAssetUrl(profile?.signatureUrl ?? null),
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      website: profile?.website ?? null,
      motto: profile?.schoolMotto ?? null,
      organizationCode: profile?.organizationCode ?? null,
      headerLines: settings.reportHeaderLines?.length ? settings.reportHeaderLines : undefined,
      rightLogoUrl: resolveIamAssetUrl(settings.reportRightLogoUrl ?? null),
    },
    verifyBase,
    orgCode,
  };
}

export class NurseryService {
  async getSettings(organizationId: string) {
    const [bands, template, subjectConfigs] = await Promise.all([
      loadBands(organizationId),
      loadTemplate(organizationId),
      prisma.nurserySubjectConfig.findMany({
        where: { organizationId },
        select: { learningArea: true },
      }),
    ]);
    const learningAreas = new Set<string>(DEFAULT_NURSERY_LEARNING_AREAS);
    for (const row of subjectConfigs) {
      if (row.learningArea?.trim()) learningAreas.add(row.learningArea.trim());
    }
    return {
      performance: bands,
      template,
      learningAreas: [...learningAreas],
      defaults: {
        performance: DEFAULT_NURSERY_PERFORMANCE_BANDS,
        template: DEFAULT_NURSERY_TEMPLATE_SETTINGS,
        learningAreas: DEFAULT_NURSERY_LEARNING_AREAS,
      },
    };
  }

  async savePerformanceBands(organizationId: string, input: unknown) {
    const bands = await saveBands(organizationId, input);
    return { performance: bands };
  }

  async saveTemplate(organizationId: string, input: unknown) {
    const template = await saveTemplate(organizationId, input);
    return { template };
  }

  async listClasses(organizationId: string, academicYearInput?: string) {
    const academicYear = academicYearInput ? yearKey(academicYearInput) : null;
    const [smClasses, localClasses, configs, subjectCounts, ttCatalog] = await Promise.all([
      smListClasses(organizationId).catch(() => []) as Promise<
        Array<{ id: string; name: string; stream?: string | null; label?: string | null; category?: string | null }>
      >,
      prisma.class.findMany({
        where: { organizationId },
        select: { id: true, name: true, stream: true, category: true },
      }),
      academicYear
        ? prisma.nurseryClassConfig.findMany({ where: { organizationId, academicYear } })
        : prisma.nurseryClassConfig.findMany({ where: { organizationId } }),
      prisma.nurserySubjectConfig.groupBy({
        by: ['classId'],
        where: { organizationId },
        _count: { _all: true },
      }),
      fetchTimetableClassCatalog(organizationId, { academicYear: academicYear ?? undefined }).catch(() => []),
    ]);

    const timetableCountById = new Map<string, number>();
    const timetableCountByLabel = new Map<string, number>();
    for (const row of ttCatalog) {
      const count = row.courses?.length ?? row.courseCount ?? 0;
      if (row.classId) timetableCountById.set(row.classId, count);
      const labelKey = normCourseName(row.className);
      if (labelKey) timetableCountByLabel.set(labelKey, count);
    }

    const subjectCount = new Map(subjectCounts.map((row) => [row.classId, row._count._all]));
    const configByClass = new Map<string, (typeof configs)[number]>();
    for (const config of configs) {
      if (academicYear && config.academicYear !== academicYear) continue;
      if (!configByClass.has(config.classId)) configByClass.set(config.classId, config);
    }

    const merged = new Map<
      string,
      {
        classId: string;
        name: string;
        stream: string | null;
        label: string;
        category: string | null;
        source: 'student-management' | 'academic';
      }
    >();
    for (const row of smClasses) {
      const label = classLabel(row);
      merged.set(row.id, {
        classId: row.id,
        name: row.name,
        stream: row.stream ?? null,
        label,
        category: row.category ?? null,
        source: 'student-management',
      });
    }
    for (const row of localClasses) {
      if (merged.has(row.id)) continue;
      merged.set(row.id, {
        classId: row.id,
        name: row.name,
        stream: row.stream,
        label: classLabel(row),
        category: row.category,
        source: 'academic',
      });
    }

    return [...merged.values()]
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map((row) => {
        const config = configByClass.get(row.classId) ?? null;
        return {
          ...row,
          configured: Boolean(config),
          enabled: config?.enabled ?? false,
          templateKey: config?.templateKey ?? 'nursery-standard',
          configId: config?.id ?? null,
          configYear: config?.academicYear ?? null,
          subjectCount:
            timetableCountById.get(row.classId) ??
            timetableCountByLabel.get(normCourseName(row.label)) ??
            timetableCountByLabel.get(normCourseName(row.name)) ??
            subjectCount.get(row.classId) ??
            0,
        };
      });
  }

  async saveClassConfig(
    organizationId: string,
    input: {
      classId?: string;
      className?: string;
      academicYear?: string;
      templateKey?: string;
      enabled?: boolean;
    }
  ) {
    const classId = String(input.classId ?? '').trim();
    if (!classId) throw new AppError(400, 'Class is required');
    const academicYear = yearKey(input.academicYear);
    const cls = await resolveAcademicClass(organizationId, { classId });
    if (!cls) throw new AppError(404, 'Class not found. Sync classes from Student Management first.');
    const label = input.className?.trim() || classLabel(cls);

    return prisma.nurseryClassConfig.upsert({
      where: {
        organizationId_classId_academicYear: { organizationId, classId, academicYear },
      },
      create: {
        organizationId,
        classId,
        className: label,
        academicYear,
        templateKey: input.templateKey?.trim() || 'nursery-standard',
        enabled: input.enabled !== false,
      },
      update: {
        className: label,
        templateKey: input.templateKey?.trim() || 'nursery-standard',
        enabled: input.enabled !== false,
      },
    });
  }

  async deleteClassConfig(organizationId: string, id: string) {
    const row = await prisma.nurseryClassConfig.findFirst({ where: { id, organizationId } });
    if (!row) throw new AppError(404, 'Class configuration not found');
    await prisma.nurseryClassConfig.delete({ where: { id: row.id } });
    return { deleted: true };
  }

  async listSubjects(
    organizationId: string,
    input: { classId?: string; academicYear?: string; term?: string }
  ) {
    const classId = String(input.classId ?? '').trim();
    if (!classId) throw new AppError(400, 'Class is required');
    const academicYear = yearKey(input.academicYear);
    const cls = await resolveAcademicClass(organizationId, { classId });
    if (!cls) throw new AppError(404, 'Class not found');

    const dataset = await gradingEngineService
      .getNurserySubjectMarks(organizationId, classId, academicYear, input.term?.trim() || undefined, 'standard')
      .catch(() => null);
    const configs = dedupeConfigsByName(
      await resolveSubjectConfigs(
        organizationId,
        classId,
        cls,
        academicYear,
        input.term?.trim() || undefined,
        dataset?.subjects
      )
    );
    const [bands, learningRows] = await Promise.all([
      loadBands(organizationId),
      prisma.nurserySubjectConfig.findMany({
        where: { organizationId },
        select: { learningArea: true },
      }),
    ]);
    const learningAreas = new Set<string>(DEFAULT_NURSERY_LEARNING_AREAS);
    for (const row of learningRows) {
      if (row.learningArea?.trim()) learningAreas.add(row.learningArea.trim());
    }

    return {
      classId,
      className: classLabel(cls),
      academicYear,
      learningAreas: [...learningAreas],
      bands,
      subjects: configs,
    };
  }

  async saveSubjects(
    organizationId: string,
    input: { classId?: string; academicYear?: string; subjects?: unknown }
  ) {
    const classId = String(input.classId ?? '').trim();
    if (!classId) throw new AppError(400, 'Class is required');
    const academicYear = yearKey(input.academicYear);
    const cls = await resolveAcademicClass(organizationId, { classId });
    if (!cls) throw new AppError(404, 'Class not found');
    if (!Array.isArray(input.subjects)) throw new AppError(400, 'Subjects are required');
    if (input.subjects.length > 200) throw new AppError(400, 'Too many subjects in one class');

    const seen = new Set<string>();
    const rows: NurserySubjectConfigInput[] = input.subjects.map((raw, index) => {
      const row = (raw ?? {}) as Record<string, unknown>;
      const subjectId = String(row.subjectId ?? '').trim();
      if (!subjectId) throw new AppError(400, 'Each subject needs an id');
      if (seen.has(subjectId)) throw new AppError(400, 'Duplicate subject in the same class');
      seen.add(subjectId);
      const learningArea = String(row.learningArea ?? '').trim();
      if (!learningArea) throw new AppError(400, 'Each subject needs a learning area');
      if (learningArea.length > 80) throw new AppError(400, 'Learning area names must be 80 characters or fewer');
      const maxMark = Number(row.maxMark ?? 100);
      if (!Number.isFinite(maxMark) || maxMark <= 0 || maxMark > 1000) {
        throw new AppError(400, 'Maximum marks must be between 1 and 1000');
      }
      return {
        subjectId,
        subjectName: typeof row.subjectName === 'string' ? row.subjectName.trim() || null : null,
        learningArea,
        maxMark,
        isVisible: row.isVisible !== false,
        contributesToTotal: row.contributesToTotal !== false,
        sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.nurserySubjectConfig.deleteMany({
        where: { organizationId, classId, subjectId: { notIn: rows.map((r) => r.subjectId) } },
      });
      for (const row of rows) {
        await tx.nurserySubjectConfig.upsert({
          where: {
            organizationId_classId_subjectId: {
              organizationId,
              classId,
              subjectId: row.subjectId,
            },
          },
          create: {
            organizationId,
            classId,
            subjectId: row.subjectId,
            subjectName: row.subjectName ?? null,
            learningArea: row.learningArea,
            maxMark: row.maxMark,
            isVisible: row.isVisible,
            contributesToTotal: row.contributesToTotal,
            sortOrder: row.sortOrder,
          },
          update: {
            subjectName: row.subjectName ?? null,
            learningArea: row.learningArea,
            maxMark: row.maxMark,
            isVisible: row.isVisible,
            contributesToTotal: row.contributesToTotal,
            sortOrder: row.sortOrder,
          },
        });
      }
    });

    return this.listSubjects(organizationId, { classId, academicYear });
  }

  private async buildContext(
    organizationId: string,
    classId: string,
    academicYearInput: string,
    termInput: string,
    reportKind: ReportKind = 'standard'
  ) {
    const academicYear = yearKey(academicYearInput);
    const term = termKey(termInput);
    const cls = await resolveAcademicClass(organizationId, { classId });
    if (!cls) throw new AppError(404, 'Class not found');

    const [dataset, bands, template, schoolInfo, roster] = await Promise.all([
      gradingEngineService.getNurserySubjectMarks(organizationId, classId, academicYear, term, reportKind),
      loadBands(organizationId),
      loadTemplate(organizationId),
      getSchool(organizationId),
      loadRoster(organizationId, classId, classLabel(cls), academicYear),
    ]);
    const allConfigs = await resolveSubjectConfigs(
      organizationId,
      classId,
      cls,
      academicYear,
      term,
      dataset.subjects
    );

    // All report stages show every course assigned in Timetable → Config Class.
    // Beginning/Mid-Term may have marks for only some courses; unassessed courses
    // remain visible with an empty performance cell.
    const assessedSubjectIds = new Set(dataset.subjects.map((subject) => subject.subjectId));
    const configs = dedupeConfigsByName(allConfigs, assessedSubjectIds);

    const rosterRows = roster.map((row) => ({
      studentId: String(row.id ?? ''),
      name: studentName(row),
      code: studentCode(row),
      gender: typeof row.gender === 'string' ? row.gender : null,
      photoUrl: resolveSmAssetUrl(typeof row.photoUrl === 'string' ? row.photoUrl : null),
    })).filter((row) => row.studentId);

    // Keep students who have recorded marks but are missing from the Student
    // Management roster (or when that service is unavailable).
    const rosterIds = new Set(rosterRows.map((row) => row.studentId));
    const missingIds = Object.keys(dataset.marks).filter((id) => !rosterIds.has(id));
    if (missingIds.length) {
      const locals = await prisma.student.findMany({
        where: { organizationId, id: { in: missingIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentCode: true,
          studentUid: true,
          gender: true,
          studentPhoto: true,
        },
      });
      for (const row of locals) {
        rosterRows.push({
          studentId: row.id,
          name: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Student',
          code: row.studentCode || row.studentUid || null,
          gender: row.gender ?? null,
          photoUrl: resolveSmAssetUrl(row.studentPhoto ?? null),
        });
      }
    }

    const results = new Map<string, ComputedResult>();
    const ids = new Set<string>([...rosterRows.map((r) => r.studentId), ...Object.keys(dataset.marks)]);
    for (const studentId of ids) {
      results.set(studentId, computeResult(configs, dataset.marks[studentId], bands));
    }

    const withMarks = [...results.entries()].filter(([, result]) => result.average != null);
    const classAverage = withMarks.length
      ? round2(withMarks.reduce((sum, [, result]) => sum + (result.average ?? 0), 0) / withMarks.length)
      : null;
    const ranked = [...withMarks].sort((a, b) => (b[1].average ?? 0) - (a[1].average ?? 0));
    const positions = new Map<string, number>();
    let lastAverage: number | null = null;
    let lastPosition = 0;
    ranked.forEach(([studentId, result], index) => {
      if (lastAverage == null || result.average !== lastAverage) {
        lastPosition = index + 1;
        lastAverage = result.average;
      }
      positions.set(studentId, lastPosition);
    });

    return {
      academicYear,
      term,
      reportKind,
      cls,
      className: classLabel(cls),
      dataset,
      configs,
      bands,
      template,
      school: schoolInfo.school,
      verifyBase: schoolInfo.verifyBase,
      orgCode: schoolInfo.orgCode,
      rosterRows,
      results,
      classAverage,
      positions,
      classSize: ranked.length,
    };
  }

  private buildSnapshot(
    ctx: Awaited<ReturnType<NurseryService['buildContext']>>,
    student: { studentId: string; name: string; code: string | null; gender: string | null; photoUrl: string | null },
    result: ComputedResult,
    comments: { teacher: string | null; headTeacher: string | null },
    verificationCode: string,
    generatedAt: Date
  ) {
    const groups = new Map<string, typeof result.subjects>();
    for (const subject of result.subjects) {
      if (!groups.has(subject.learningArea)) groups.set(subject.learningArea, []);
      groups.get(subject.learningArea)!.push(subject);
    }

    const verifyUrl = `${ctx.verifyBase}?ref=${encodeURIComponent(verificationCode)}${
      ctx.orgCode ? `&org=${encodeURIComponent(ctx.orgCode)}` : ''
    }`;

    return {
      kind: 'nursery',
      reportKind: ctx.reportKind,
      school: ctx.school,
      student: {
        id: student.studentId,
        name: student.name,
        studentCode: student.code,
        gender: student.gender,
        photoUrl: student.photoUrl,
      },
      class: { id: ctx.cls.id, name: ctx.className },
      academicYear: ctx.academicYear,
      term: ctx.term,
      template: ctx.template,
      bands: ctx.bands,
      subjects: result.subjects,
      groups: [...groups.entries()].map(([learningArea, subjects]) => ({ learningArea, subjects })),
      totals: {
        totalScore: result.totalScore,
        totalMax: result.totalMax,
        average: result.average,
        classAverage: ctx.classAverage,
        position: ctx.positions.get(student.studentId) ?? null,
        classSize: ctx.classSize,
      },
      comments: {
        teacher: comments.teacher,
        headTeacher: comments.headTeacher,
      },
      meta: {
        reportNumber: verificationCode,
        verificationCode,
        verifyUrl,
        generatedAt: generatedAt.toISOString(),
      },
    };
  }

  async listReports(
    organizationId: string,
    input: { classId?: string; academicYear?: string; term?: string; search?: string; reportKind?: string }
  ) {
    const classId = String(input.classId ?? '').trim();
    if (!classId) throw new AppError(400, 'Select a class to load nursery reports');
    const reportKind = normalizeReportKind(input.reportKind);
    const ctx = await this.buildContext(
      organizationId,
      classId,
      String(input.academicYear ?? ''),
      String(input.term ?? ''),
      reportKind
    );
    const reports = await prisma.nurseryReport.findMany({
      where: {
        organizationId,
        classId,
        academicYear: ctx.academicYear,
        term: ctx.term,
        reportKind,
      },
    });
    const reportByStudent = new Map(reports.map((row) => [row.studentId, row]));

    const search = input.search?.trim().toLowerCase() ?? '';
    const students = ctx.rosterRows
      .map((student) => {
        const report = reportByStudent.get(student.studentId) ?? null;
        const result = ctx.results.get(student.studentId);
        return {
          studentId: student.studentId,
          name: student.name,
          studentCode: student.code,
          gender: student.gender,
          photoUrl: student.photoUrl,
          reportId: report?.id ?? null,
          status: report ? report.status : 'PENDING',
          average: report?.average ?? result?.average ?? null,
          totalScore: report?.totalScore ?? result?.totalScore ?? null,
          position: report
            ? ((report.snapshot as any)?.totals?.position ?? null)
            : ctx.positions.get(student.studentId) ?? null,
          classAverage: report?.classAverage ?? ctx.classAverage,
          generatedAt: report?.generatedAt?.toISOString() ?? null,
          publishedAt: report?.publishedAt?.toISOString() ?? null,
          hasMarks: result?.average != null,
        };
      })
      .filter((student) => {
        if (!search) return true;
        return (
          student.name.toLowerCase().includes(search) ||
          (student.studentCode ?? '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const generated = students.filter((s) => s.status === 'GENERATED').length;
    const published = students.filter((s) => s.status === 'PUBLISHED').length;
    const pending = students.filter((s) => !s.reportId).length;

    return {
      classId,
      className: ctx.className,
      academicYear: ctx.academicYear,
      term: ctx.term,
      reportKind,
      bands: ctx.bands,
      students,
      stats: {
        totalStudents: students.length,
        generated,
        published,
        pending,
        generatedTotal: generated + published,
        classAverage: ctx.classAverage,
      },
    };
  }

  async generateForStudent(
    organizationId: string,
    input: {
      studentId?: string;
      classId?: string;
      academicYear?: string;
      term?: string;
      reportKind?: string;
      actorId?: string;
    }
  ) {
    const studentId = String(input.studentId ?? '').trim();
    if (!studentId) throw new AppError(400, 'Student is required');
    const reportKind = normalizeReportKind(input.reportKind);
    const ctx = await this.buildContext(
      organizationId,
      String(input.classId ?? ''),
      String(input.academicYear ?? ''),
      String(input.term ?? ''),
      reportKind
    );
    const student = ctx.rosterRows.find((row) => row.studentId === studentId);
    if (!student) throw new AppError(404, 'Student is not in this class for the selected year');
    if (!ctx.configs.length) throw new AppError(400, stageNoMarksMessage(reportKind));

    const result = ctx.results.get(studentId) ?? computeResult(ctx.configs, undefined, ctx.bands);
    const existing = await prisma.nurseryReport.findUnique({
      where: {
        organizationId_studentId_classId_academicYear_term_reportKind: {
          organizationId,
          studentId,
          classId: String(input.classId ?? '').trim(),
          academicYear: ctx.academicYear,
          term: ctx.term,
          reportKind,
        },
      },
    });
    const verificationCode = existing?.verificationCode ?? randomVerificationCode(ctx.academicYear);
    const comments = {
      teacher: existing?.teacherComment ?? null,
      headTeacher: existing?.headTeacherComment ?? null,
    };
    const generatedAt = new Date();
    const snapshot = this.buildSnapshot(ctx, student, result, comments, verificationCode, generatedAt);

    const saved = await prisma.nurseryReport.upsert({
      where: {
        organizationId_studentId_classId_academicYear_term_reportKind: {
          organizationId,
          studentId,
          classId: String(input.classId ?? '').trim(),
          academicYear: ctx.academicYear,
          term: ctx.term,
          reportKind,
        },
      },
      create: {
        organizationId,
        studentId,
        classId: String(input.classId ?? '').trim(),
        academicYear: ctx.academicYear,
        term: ctx.term,
        reportKind,
        status: 'GENERATED',
        studentName: student.name,
        className: ctx.className,
        totalScore: result.totalScore,
        average: result.average,
        classAverage: ctx.classAverage,
        teacherComment: comments.teacher,
        headTeacherComment: comments.headTeacher,
        verificationCode,
        snapshot: snapshot as Prisma.InputJsonValue,
        generatedBy: input.actorId ?? null,
      },
      update: {
        status: 'GENERATED',
        studentName: student.name,
        className: ctx.className,
        totalScore: result.totalScore,
        average: result.average,
        classAverage: ctx.classAverage,
        snapshot: snapshot as Prisma.InputJsonValue,
        generatedBy: input.actorId ?? null,
        generatedAt,
        publishedAt: null,
        publishedBy: null,
        publishedByName: null,
      },
    });

    return { report: saved, snapshot };
  }

  async generateForClass(
    organizationId: string,
    input: {
      classId?: string;
      academicYear?: string;
      term?: string;
      reportKind?: string;
      studentIds?: string[];
      actorId?: string;
    }
  ) {
    const classId = String(input.classId ?? '').trim();
    if (!classId) throw new AppError(400, 'Class is required');
    const reportKind = normalizeReportKind(input.reportKind);
    const ctx = await this.buildContext(
      organizationId,
      classId,
      String(input.academicYear ?? ''),
      String(input.term ?? ''),
      reportKind
    );
    if (!ctx.configs.length) throw new AppError(400, stageNoMarksMessage(reportKind));
    const selected = Array.isArray(input.studentIds) && input.studentIds.length
      ? new Set(input.studentIds.map((id) => String(id)))
      : null;

    const existing = await prisma.nurseryReport.findMany({
      where: { organizationId, classId, academicYear: ctx.academicYear, term: ctx.term, reportKind },
    });
    const existingByStudent = new Map(existing.map((row) => [row.studentId, row]));

    let generated = 0;
    const errors: string[] = [];
    for (const student of ctx.rosterRows) {
      if (selected && !selected.has(student.studentId)) continue;
      try {
        const result = ctx.results.get(student.studentId) ?? computeResult(ctx.configs, undefined, ctx.bands);
        const current = existingByStudent.get(student.studentId) ?? null;
        const verificationCode = current?.verificationCode ?? randomVerificationCode(ctx.academicYear);
        const comments = {
          teacher: current?.teacherComment ?? null,
          headTeacher: current?.headTeacherComment ?? null,
        };
        const generatedAt = new Date();
        const snapshot = this.buildSnapshot(ctx, student, result, comments, verificationCode, generatedAt);
        await prisma.nurseryReport.upsert({
          where: {
            organizationId_studentId_classId_academicYear_term_reportKind: {
              organizationId,
              studentId: student.studentId,
              classId,
              academicYear: ctx.academicYear,
              term: ctx.term,
              reportKind,
            },
          },
          create: {
            organizationId,
            studentId: student.studentId,
            classId,
            academicYear: ctx.academicYear,
            term: ctx.term,
            reportKind,
            status: 'GENERATED',
            studentName: student.name,
            className: ctx.className,
            totalScore: result.totalScore,
            average: result.average,
            classAverage: ctx.classAverage,
            teacherComment: comments.teacher,
            headTeacherComment: comments.headTeacher,
            verificationCode,
            snapshot: snapshot as Prisma.InputJsonValue,
            generatedBy: input.actorId ?? null,
          },
          update: {
            status: 'GENERATED',
            studentName: student.name,
            className: ctx.className,
            totalScore: result.totalScore,
            average: result.average,
            classAverage: ctx.classAverage,
            snapshot: snapshot as Prisma.InputJsonValue,
            generatedBy: input.actorId ?? null,
            generatedAt,
            publishedAt: null,
            publishedBy: null,
            publishedByName: null,
          },
        });
        generated += 1;
      } catch (err) {
        errors.push(`${student.name}: ${err instanceof Error ? err.message : 'generation failed'}`);
      }
    }

    return {
      generated,
      skipped: ctx.rosterRows.length - generated - errors.length,
      total: ctx.rosterRows.length,
      errors,
      classAverage: ctx.classAverage,
    };
  }

  async getReport(organizationId: string, id: string) {
    const row = await prisma.nurseryReport.findFirst({ where: { id, organizationId } });
    if (!row) throw new AppError(404, 'Nursery report not found');
    return row;
  }

  async updateComments(
    organizationId: string,
    id: string,
    input: { teacherComment?: string | null; headTeacherComment?: string | null }
  ) {
    const row = await prisma.nurseryReport.findFirst({ where: { id, organizationId } });
    if (!row) throw new AppError(404, 'Nursery report not found');
    if (
      input.teacherComment !== undefined &&
      typeof input.teacherComment !== 'string' &&
      input.teacherComment !== null
    ) {
      throw new AppError(400, 'Teacher comment must be text');
    }
    if (
      input.headTeacherComment !== undefined &&
      typeof input.headTeacherComment !== 'string' &&
      input.headTeacherComment !== null
    ) {
      throw new AppError(400, 'Head teacher comment must be text');
    }
    const teacherComment =
      input.teacherComment === undefined ? row.teacherComment : input.teacherComment?.trim() || null;
    const headTeacherComment =
      input.headTeacherComment === undefined
        ? row.headTeacherComment
        : input.headTeacherComment?.trim() || null;

    const snapshot = {
      ...((row.snapshot as Record<string, unknown>) ?? {}),
      comments: { teacher: teacherComment, headTeacher: headTeacherComment },
    };
    const resetPublication = row.status === 'PUBLISHED';

    return prisma.nurseryReport.update({
      where: { id: row.id },
      data: {
        ...(resetPublication ? { status: 'GENERATED', publishedAt: null, publishedBy: null, publishedByName: null } : {}),
        teacherComment,
        headTeacherComment,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
    });
  }

  async publish(
    organizationId: string,
    input: {
      ids?: string[];
      classId?: string;
      academicYear?: string;
      term?: string;
      reportKind?: string;
      actorId?: string;
      actorName?: string;
    }
  ) {
    const ids = Array.isArray(input.ids) ? input.ids.map((id) => String(id)).filter(Boolean) : [];
    const where: Prisma.NurseryReportWhereInput = { organizationId };
    if (ids.length) where.id = { in: ids };
    else {
      if (!input.classId) throw new AppError(400, 'Select reports or a class to publish');
      where.classId = String(input.classId);
      where.academicYear = yearKey(input.academicYear);
      where.term = termKey(input.term);
      where.reportKind = normalizeReportKind(input.reportKind);
    }

    const rows = await prisma.nurseryReport.findMany({ where, select: { id: true } });
    if (!rows.length) return { published: 0 };
    const result = await prisma.nurseryReport.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: input.actorId ?? null,
        publishedByName: input.actorName ?? null,
      },
    });
    return { published: result.count };
  }

  async verifyPublic(code: string) {
    const ref = code.trim();
    if (!ref) throw new AppError(400, 'Report reference is required');
    const row = await prisma.nurseryReport.findUnique({
      where: { verificationCode: ref },
      include: { tenant: { select: { organizationName: true } } },
    });
    if (!row) {
      return {
        valid: false,
        reportNumber: ref,
        schoolName: null,
        message: 'No nursery report matches this reference. Check the QR code or ask the school.',
      };
    }
    return {
      valid: true,
      reportNumber: row.verificationCode,
      schoolName: row.tenant?.organizationName ?? null,
      className: row.className,
      academicYear: row.academicYear,
      term: row.term,
      reportKind: row.reportKind,
      status: row.status,
      message: 'This nursery report was issued by the school through Shule+.',
    };
  }
}

export const nurseryService = new NurseryService();

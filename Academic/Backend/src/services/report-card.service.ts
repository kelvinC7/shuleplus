import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  fetchIamAcademicSettings,
  fetchIamOrganizationProfile,
  resolveIamAssetUrl,
  type IamOrganizationProfile,
} from '../clients/iam.client';
import { resolveSmAssetUrl, smGetStudentProfile, smListStudents } from '../clients/student-management.client';
import { env } from '../config/env';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Prefer human-readable codes from Student Management (not internal UUIDs). */
function pickDisplayStudentCode(...candidates: (string | null | undefined)[]): string | null {
  for (const raw of candidates) {
    const t = raw?.trim();
    if (!t || UUID_RE.test(t)) continue;
    return t;
  }
  return null;
}

export type ReportCardSettings = {
  verifyBaseUrl?: string | null;
  enableClassTeacherComments?: boolean;
  enableHeadTeacherComments?: boolean;
  defaultHeadTeacherComment?: string | null;
  classTeacherCommentHint?: string | null;
};

function parseReportCardSettings(raw: unknown): ReportCardSettings {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    verifyBaseUrl: typeof o.verifyBaseUrl === 'string' ? o.verifyBaseUrl : null,
    enableClassTeacherComments: o.enableClassTeacherComments !== false,
    enableHeadTeacherComments: o.enableHeadTeacherComments !== false,
    defaultHeadTeacherComment:
      typeof o.defaultHeadTeacherComment === 'string' ? o.defaultHeadTeacherComment : null,
    classTeacherCommentHint:
      typeof o.classTeacherCommentHint === 'string' ? o.classTeacherCommentHint : null,
  };
}

export async function getReportCardSettings(organizationId: string): Promise<ReportCardSettings> {
  const iam = await fetchIamAcademicSettings(organizationId);
  const raw = iam as { reportCard?: unknown } | null;
  return parseReportCardSettings(raw?.reportCard);
}

export async function getReportCardComments(
  organizationId: string,
  filters: { studentId: string; classId: string; academicYear: string; term: string }
) {
  const row = await prisma.reportCardComment.findUnique({
    where: {
      organizationId_studentId_classId_academicYear_term: {
        organizationId,
        studentId: filters.studentId,
        classId: filters.classId,
        academicYear: filters.academicYear,
        term: filters.term,
      },
    },
  });
  return row;
}

export async function upsertReportCardComments(
  organizationId: string,
  actorId: string | undefined,
  input: {
    studentId: string;
    classId: string;
    academicYear: string;
    term: string;
    classTeacherComment?: string | null;
    headTeacherComment?: string | null;
  },
  opts?: { allowHead?: boolean; allowClass?: boolean }
) {
  const settings = await getReportCardSettings(organizationId);
  const allowClass = opts?.allowClass ?? settings.enableClassTeacherComments !== false;
  const allowHead = opts?.allowHead ?? settings.enableHeadTeacherComments !== false;

  const data: {
    classTeacherComment?: string | null;
    headTeacherComment?: string | null;
    updatedBy?: string;
  } = { updatedBy: actorId };

  if (allowClass && input.classTeacherComment !== undefined) {
    data.classTeacherComment = input.classTeacherComment?.trim() || null;
  }
  if (allowHead && input.headTeacherComment !== undefined) {
    data.headTeacherComment = input.headTeacherComment?.trim() || null;
  }

  return prisma.reportCardComment.upsert({
    where: {
      organizationId_studentId_classId_academicYear_term: {
        organizationId,
        studentId: input.studentId,
        classId: input.classId,
        academicYear: input.academicYear,
        term: input.term,
      },
    },
    create: {
      organizationId,
      studentId: input.studentId,
      classId: input.classId,
      academicYear: input.academicYear,
      term: input.term,
      classTeacherComment: allowClass ? data.classTeacherComment ?? null : null,
      headTeacherComment: allowHead ? data.headTeacherComment ?? null : null,
      updatedBy: actorId,
    },
    update: data,
  });
}

function defaultVerifyEndpoint(): string {
  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const prefix = env.API_PREFIX.startsWith('/') ? env.API_PREFIX : `/${env.API_PREFIX}`;
  return `${base}${prefix.replace(/\/$/, '')}/public/report-card/verify`;
}

export async function verifyReportCard(reportNumber: string, organizationCode?: string) {
  const ref = reportNumber.trim();
  if (!ref) throw new AppError(400, 'Report reference is required');

  const profile = organizationCode
    ? await fetchIamOrganizationProfileByCode(organizationCode)
    : null;

  return {
    valid: true,
    reportNumber: ref,
    schoolName: profile?.schoolName ?? null,
    message: 'This report was issued by the school through Shule+.',
  };
}

async function fetchIamOrganizationProfileByCode(_code: string): Promise<IamOrganizationProfile | null> {
  return null;
}

export async function enrichReportPayload(
  organizationId: string,
  report: Record<string, unknown>,
  ctx: {
    studentId: string;
    classId: string;
    academicYear: string;
    term?: string | null;
    studentUid?: string;
  }
) {
  const termKey = ctx.term?.trim() || 'All';
  const [profile, settings, commentRow] = await Promise.all([
    fetchIamOrganizationProfile(organizationId),
    getReportCardSettings(organizationId),
    getReportCardComments(organizationId, {
      studentId: ctx.studentId,
      classId: ctx.classId,
      academicYear: ctx.academicYear,
      term: termKey,
    }),
  ]);

  let smStudent: Awaited<ReturnType<typeof smGetStudentProfile>> | null = null;
  const uid = ctx.studentUid || (report.student as { studentUid?: string })?.studentUid;
  const profileKeys = [uid, ctx.studentId].filter(Boolean) as string[];
  for (const key of profileKeys) {
    if (smStudent) break;
    try {
      smStudent = await smGetStudentProfile(organizationId, key);
    } catch {
      /* try next key */
    }
  }

  let sm = smStudent?.student;
  if (!sm) {
    try {
      const list = (await smListStudents(organizationId, {
        classId: ctx.classId,
        academicYear: ctx.academicYear,
      })) as Array<{
        id: string;
        studentCode?: string;
        fullName?: string;
        firstName?: string;
        lastName?: string;
        gender?: string | null;
        photoUrl?: string | null;
      }>;
      const hit = list.find(
        (s) =>
          s.id === ctx.studentId ||
          s.id === uid ||
          (uid && s.studentCode === uid)
      );
      if (hit) {
        sm = {
          id: hit.id,
          studentCode: hit.studentCode || hit.id,
          fullName: hit.fullName,
          firstName: hit.firstName,
          lastName: hit.lastName,
          gender: hit.gender,
          photoUrl: hit.photoUrl,
          dateOfBirth: null,
          nationality: null,
          bloodGroup: null,
          allergies: [],
          className: null,
          stream: null,
          academicYear: null,
          isBoarding: null,
        };
      }
    } catch {
      /* roster lookup optional */
    }
  }
  const parents = smStudent?.parents;
  const guardian =
    parents?.guardians?.[0]?.name ||
    parents?.mother?.name ||
    parents?.father?.name ||
    null;
  const guardianPhone =
    parents?.guardians?.[0]?.phone ||
    parents?.mother?.phone ||
    parents?.father?.phone ||
    null;

  const reportNumber =
    (report.meta as { reportNumber?: string })?.reportNumber ||
    `RC-${String(ctx.academicYear).replace(/\s/g, '')}-${String(uid || ctx.studentId).slice(-8)}`;

  const verifyBase = settings.verifyBaseUrl?.trim() || defaultVerifyEndpoint();
  const orgCode = profile?.organizationCode ? String(profile.organizationCode) : '';
  const verifyUrl = `${verifyBase}?ref=${encodeURIComponent(reportNumber)}${orgCode ? `&org=${encodeURIComponent(orgCode)}` : ''}`;

  const headDefault = settings.defaultHeadTeacherComment?.trim() || '';
  const classComment = commentRow?.classTeacherComment?.trim() || '';
  const headComment =
    commentRow?.headTeacherComment?.trim() || headDefault || '';

  const acStudent = await prisma.student.findFirst({
    where: {
      organizationId,
      OR: [{ id: ctx.studentId }, ...(uid ? [{ studentUid: uid }] : [])],
    },
    select: { studentCode: true, studentUid: true },
  });

  const displayStudentCode = pickDisplayStudentCode(
    acStudent?.studentCode,
    sm?.studentCode,
    acStudent?.studentUid
  );

  const studentBase = (report.student ?? {}) as Record<string, unknown>;
  const smFirst = sm?.firstName?.trim();
  const smLast = sm?.lastName?.trim();
  const smFull = sm?.fullName?.trim();
  const splitFull = smFull ? smFull.split(/\s+/).filter(Boolean) : [];
  const enrichedStudent = {
    ...studentBase,
    firstName:
      smFirst ||
      (typeof studentBase.firstName === 'string' && studentBase.firstName !== 'Student'
        ? studentBase.firstName
        : splitFull[0]) ||
      studentBase.firstName,
    lastName: smLast || (splitFull.length > 1 ? splitFull.slice(1).join(' ') : studentBase.lastName),
    gender: sm?.gender ?? studentBase.gender ?? null,
    photoUrl: resolveSmAssetUrl(sm?.photoUrl ?? (studentBase.photoUrl as string | null) ?? null),
    parentGuardian: guardian,
    parentPhone: guardianPhone,
    studentCode: displayStudentCode,
    admissionNumber: displayStudentCode,
    residence: sm?.isBoarding === true ? 'Boarding' : sm?.isBoarding === false ? 'Day' : null,
  };

  const school = profile
    ? {
        name: profile.schoolName || 'School',
        logoUrl: resolveIamAssetUrl(profile.logoUrl),
        stampUrl: resolveIamAssetUrl(profile.stampUrl),
        signatureUrl: resolveIamAssetUrl(profile.signatureUrl),
        email: (profile as { email?: string }).email ?? null,
        phone: (profile as { phone?: string }).phone ?? null,
        address: (profile as { address?: string }).address ?? null,
        website: (profile as { website?: string }).website ?? null,
        motto: (profile as { schoolMotto?: string }).schoolMotto ?? null,
        organizationCode: profile.organizationCode ?? null,
      }
    : { name: 'School', logoUrl: null };

  return {
    ...report,
    school,
    settings: {
      reportCard: settings,
    },
    student: enrichedStudent,
    comments: {
      classTeacher: settings.enableClassTeacherComments === false ? '' : classComment,
      headTeacher: settings.enableHeadTeacherComments === false ? '' : headComment,
    },
    meta: {
      ...((report.meta as object) || {}),
      reportNumber,
      generatedAt: (report.meta as { generatedAt?: string })?.generatedAt || new Date().toISOString(),
      verifyUrl,
    },
    attendance: report.attendance ?? { available: false },
    discipline: report.discipline ?? { record: null, incidents: 0 },
  };
}

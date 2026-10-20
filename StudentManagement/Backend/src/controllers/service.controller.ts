import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { classService } from '../services/class.service';
import { parentService } from '../services/parent.service';
import { studentService } from '../services/student.service';
import { dashboardService } from '../services/dashboard.service';
import { classMonitorService } from '../services/class-monitor.service';
import { resolvePhotoUrl } from '../utils/photo-url';

function classLabel(c: {
  name: string;
  stream?: string | null;
  grade?: { name?: string | null } | null;
}): string {
  const name = String(c.name ?? '').trim();
  const stream = String(c.stream ?? '').trim();
  if (!stream) return name || c.grade?.name || c.name;
  const last = name.split(/[\s·]+/).filter(Boolean).pop()?.toLowerCase();
  if (last === stream.toLowerCase()) return name;
  return `${name} ${stream}`.trim();
}

function resolvePhoto(photo: string | null | undefined): string | null {
  return resolvePhotoUrl(photo);
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

type ClassRef = {
  id: string;
  name: string;
  stream?: string | null;
  grade?: { name?: string | null } | null;
};

function matchClassLabel(classes: ClassRef[], className: string): ClassRef | undefined {
  const target = normalize(className);
  if (!target) return undefined;
  const compact = target.replace(/\s+/g, '');

  const exact = classes.find((c) => normalize(classLabel(c)) === target);
  if (exact) return exact;

  const byCompact = classes.find((c) => normalize(classLabel(c)).replace(/\s+/g, '') === compact);
  if (byCompact) return byCompact;

  const byName = classes.find((c) => normalize(c.name) === target || normalize(c.name).replace(/\s+/g, '') === compact);
  if (byName) return byName;

  const parts = className.trim().split(/\s+/);
  if (parts.length >= 2) {
    const streamPart = parts[parts.length - 1]!;
    const namePart = parts.slice(0, -1).join(' ');
    const byNameStream = classes.find(
      (c) =>
        normalize(c.name) === normalize(namePart) &&
        normalize(c.stream ?? '') === normalize(streamPart)
    );
    if (byNameStream) return byNameStream;
  }

  return undefined;
}

export const serviceController = {
  async listClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const headTeacherUserId =
        typeof req.query.headTeacherUserId === 'string' ? req.query.headTeacherUserId : undefined;
      const headTeacherEmail =
        typeof req.query.headTeacherEmail === 'string' ? req.query.headTeacherEmail : undefined;
      const headTeacherUserIds =
        typeof req.query.headTeacherUserIds === 'string'
          ? req.query.headTeacherUserIds.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
      const rows = await classService.list(req.organizationRef!, {
        headTeacherUserId,
        headTeacherUserIds,
        headTeacherEmail,
      });
      const data = rows.map((c) => ({
        id: c.id,
        name: c.name,
        stream: c.stream,
        category: c.category,
        label: classLabel(c),
        grade: c.grade,
        combination: c.combination,
        headTeacherUserId: c.headTeacherUserId,
        headTeacherRefId: c.headTeacherRefId,
        headTeacherName: c.headTeacherName,
        headTeacherEmail: c.headTeacherEmail,
        headTeacherSource: c.headTeacherSource,
      }));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      let classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const className = typeof req.query.className === 'string' ? req.query.className : undefined;
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'ACTIVE';
      const status = statusRaw === 'ALL' ? undefined : statusRaw;

      let resolvedClass: ClassRef | undefined;
      if (!classId && className) {
        const classes = await classService.list(organizationId);
        resolvedClass = matchClassLabel(classes, className);
        classId = resolvedClass?.id;
      } else if (classId) {
        try {
          const full = await classService.getById(classId, organizationId);
          resolvedClass = {
            id: full.id,
            name: full.name,
            stream: full.stream,
            grade: full.grade,
          };
        } catch {
          resolvedClass = undefined;
        }
      }

      if ((className || req.query.classId) && !classId) {
        res.json({
          success: true,
          data: [],
          meta: { classId: null, classLabel: className ?? null, matched: false },
        });
        return;
      }

      const students = await studentService.list(organizationId, {
        classId,
        status,
        academicYear,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        rfidUid: typeof req.query.rfidUid === 'string' ? req.query.rfidUid : undefined,
      });

      const data = students.map((s, index) => {
        const enrollment = s.enrollments?.[0];
        const cls = enrollment?.class ?? resolvedClass;
        const parent = s.studentParents?.[0]?.parent;
        return {
          id: s.id,
          studentCode: s.studentCode || s.studentUid || s.id,
          fullName: [s.firstName, s.lastName].filter(Boolean).join(' ').trim(),
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender === 'FEMALE' ? 'F' : s.gender === 'MALE' ? 'M' : s.gender,
          photoUrl: resolvePhoto(s.studentPhoto),
          photoId: s.photoId ?? null,
          rfidUid: s.rfidUid ?? null,
          fingerprintId: s.fingerprintId ?? null,
          classId: cls?.id ?? classId ?? null,
          className: cls ? classLabel(cls) : className ?? null,
          stream: cls?.stream ?? null,
          academicYear: enrollment?.academicYear ?? null,
          educationLevel: cls?.category ?? null,
          rollNumber: String(index + 1),
          status: s.status,
          parentName: parent ? [parent.firstName, parent.lastName].filter(Boolean).join(' ').trim() : null,
          parentPhone: parent?.phone ?? null,
        };
      });

      res.json({
        success: true,
        data,
        meta: {
          classId: classId ?? null,
          classLabel: resolvedClass ? classLabel(resolvedClass) : className ?? null,
          matched: Boolean(classId),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: parents with their linked students (ShuleKit etc. master-data sync). */
  async listParents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
      const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;
      const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined;

      const rows = await parentService.listWithStudents(organizationId);

      const data = rows
        .map((p) => ({
          id: p.id,
          fullName: [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          email: p.email,
          nationalId: p.nationalId,
          occupation: p.occupation,
          address: p.address,
          smsEnabled: p.smsEnabled,
          students: (p.studentParents ?? []).map((sp) => {
            const enrollment = sp.student?.enrollments?.[0];
            const cls = enrollment?.class;
            return {
              studentId: sp.student?.id,
              studentCode: sp.student?.studentCode || sp.student?.studentUid || sp.student?.id,
              studentName: sp.student
                ? [sp.student.firstName, sp.student.lastName].filter(Boolean).join(' ').trim()
                : null,
              className: cls ? classLabel(cls) : null,
              role: sp.role,
            };
          }),
        }))
        .filter((p) => {
          if (parentId && p.id !== parentId) return false;
          if (phone) {
            const digits = (value: string | null | undefined) => String(value ?? '').replace(/\D/g, '');
            const want = digits(phone);
            const have = digits(p.phone);
            if (want && have && !have.endsWith(want.slice(-9)) && !want.endsWith(have.slice(-9))) return false;
          }
          if (
            studentId &&
            !p.students.some(
              (s) => s.studentId === studentId || s.studentCode === studentId
            )
          ) {
            return false;
          }
          return true;
        });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: list subjects for a given organization. */
  async listSubjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const { subjectService } = await import('../services/subject.service');
      const data = await subjectService.list(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: toggle SMS enabled flag on a parent. */
  async toggleParentSms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const parentId = req.params.parentId as string;
      const { enabled } = req.body as { enabled: boolean };
      if (typeof enabled !== 'boolean') {
        throw new AppError(400, 'enabled boolean is required');
      }
      const updated = await parentService.toggleSmsEnabled(parentId, organizationId, enabled);
      res.json({ success: true, data: { id: updated.id, smsEnabled: updated.smsEnabled } });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: enable/disable SMS for all parents in the school. */
  async bulkParentSms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const { enabled, onlyWithPhone } = req.body as { enabled?: boolean; onlyWithPhone?: boolean };
      if (typeof enabled !== 'boolean') {
        throw new AppError(400, 'enabled boolean is required');
      }
      const data = await parentService.bulkSetSmsEnabled(
        organizationId,
        enabled,
        onlyWithPhone !== false
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateStudentIdentity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId as string;
      const organizationId = req.organizationRef!;
      const body = req.body as {
        rfidUid?: string | null;
        fingerprintId?: string | null;
        identityRemarks?: string | null;
      };
      const data = await studentService.updateIdentity(studentId, organizationId, body);
      res.json({
        success: true,
        data: {
          id: data.id,
          rfidUid: data.rfidUid,
          fingerprintId: data.fingerprintId,
          identityRemarks: data.identityRemarks,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStudentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId as string;
      const organizationId = req.organizationRef!;
      const status = String((req.body as { status?: string })?.status ?? '').toUpperCase();
      const allowed = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'] as const;
      if (!allowed.includes(status as (typeof allowed)[number])) {
        throw new AppError(400, 'status must be ACTIVE, INACTIVE, GRADUATED, TRANSFERRED or WITHDRAWN');
      }
      const data = await studentService.updateStatus(studentId, organizationId, status as (typeof allowed)[number]);
      res.json({ success: true, data: { id: data.id, status: data.status } });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: academic performance + upcoming exams for a student (ParentMIS). */
  async listAcademics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const studentCode =
        typeof req.query.studentCode === 'string' ? req.query.studentCode : undefined;

      if (!studentCode) throw new AppError(400, 'studentCode is required');

      const student = await prisma.student.findFirst({
        where: {
          organizationId,
          OR: [{ studentCode }, { studentUid: studentCode }],
        },
        include: {
          enrollments: {
            where: { isCurrent: true, status: 'ACTIVE' },
            include: { class: { include: { grade: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!student) throw new AppError(404, 'Student not found');

      const enrollment = student.enrollments[0];
      const classId = enrollment?.classId ?? null;

      const classLabel = (c: { name: string; stream?: string | null }) =>
        [c.name, c.stream].filter(Boolean).join(' ').trim();

      const [marks, exams] = await Promise.all([
        prisma.markEntry.findMany({
          where: {
            organizationId,
            studentId: student.id,
            exam: { status: { not: 'DRAFT' } },
          },
          include: { subject: true, exam: true },
          orderBy: { exam: { startDate: 'desc' } },
        }),
        prisma.exam.findMany({
          where: { organizationId },
          orderBy: [{ academicYear: 'desc' }, { startDate: 'desc' }],
        }),
      ]);

      const classStudents = classId
        ? await prisma.enrollment.count({
            where: { organizationId, classId, isCurrent: true, status: 'ACTIVE' },
          })
        : 0;

      const gradeFromScore = (total: number): string => {
        if (total >= 80) return 'A';
        if (total >= 75) return 'B+';
        if (total >= 70) return 'B';
        if (total >= 60) return 'B-';
        if (total >= 50) return 'C';
        if (total >= 40) return 'D';
        return 'E';
      };

      // Group marks by (term, subject) -> average score
      const termMap = new Map<string, Map<string, { name: string; total: number; count: number }>>();
      for (const m of marks) {
        const term = m.exam.term ?? m.exam.name;
        const year = m.exam.academicYear;
        const key = `${year}|${term}`;
        if (!termMap.has(key)) termMap.set(key, new Map());
        const subjectMap = termMap.get(key)!;
        const entry = subjectMap.get(m.subject.name) ?? {
          name: m.subject.name,
          total: 0,
          count: 0,
        };
        entry.total += Number(m.score);
        entry.count += 1;
        subjectMap.set(m.subject.name, entry);
      }

      // Class ranks per (term, subject): this student's average vs classmates' averages
      const peerMarks = classId
        ? await prisma.markEntry.findMany({
            where: { organizationId, classId, studentId: { not: student.id } },
            include: { exam: true, subject: true },
          })
        : [];
      const peerAvgMap = new Map<string, number>();
      const peerCountMap = new Map<string, number>();
      for (const pm of peerMarks) {
        const term = pm.exam.term ?? pm.exam.name;
        const key = `${pm.exam.academicYear}|${term}|${pm.subject.name}`;
        peerAvgMap.set(key, (peerAvgMap.get(key) ?? 0) + Number(pm.score));
        peerCountMap.set(key, (peerCountMap.get(key) ?? 0) + 1);
      }

      const terms = [...termMap.entries()].map(([key, subjectMap]) => {
        const [academicYear, term] = key.split('|');
        const subjects = [...subjectMap.values()]
          .map((s) => {
            const total = Math.round(s.total / s.count);
            const ca = Math.round(total * 0.4);
            const exam = Math.round(total * 0.6);
            const peerKey = `${academicYear}|${term}|${s.name}`;
            const peerAvg = peerCountMap.has(peerKey)
              ? Math.round(peerAvgMap.get(peerKey)! / peerCountMap.get(peerKey)!)
              : null;
            let rank = 1;
            if (peerAvg != null && peerAvg > total) rank = 2;
            return {
              subject: s.name,
              ca,
              exam,
              total,
              grade: gradeFromScore(total),
              rank,
            };
          })
          .sort((a, b) => b.total - a.total);

        const gpa = subjects.length
          ? Math.round((subjects.reduce((sum, x) => sum + x.total, 0) / subjects.length / 25) * 10) / 10
          : 0;
        const classRank = subjects.length
          ? Math.min(...subjects.map((s) => s.rank || 99))
          : 0;

        return {
          term,
          academicYear,
          gpa,
          classRank,
          totalStudents: classStudents,
          subjects,
        };
      });

      const now = new Date();
      const upcomingExams = exams
        .filter((e) => {
          if (!e.startDate) return false;
          return (
            e.startDate >= now &&
            e.status !== 'CANCELLED' &&
            e.status !== 'COMPLETED' &&
            e.status !== 'DRAFT'
          );
        })
        .slice(0, 24)
        .map((e) => ({
          id: e.id,
          subject: e.name.replace(/ Exam$/i, ''),
          date: e.startDate!.toISOString(),
          type: e.type,
          term: e.term ?? '',
          academicYear: e.academicYear,
          status: e.status,
        }));

      const yearsSet = new Set<string>();
      const termsByYear = new Map<string, Set<string>>();
      for (const t of terms) {
        yearsSet.add(t.academicYear);
        if (!termsByYear.has(t.academicYear)) termsByYear.set(t.academicYear, new Set());
        termsByYear.get(t.academicYear)!.add(t.term);
      }
      for (const e of exams) {
        if (e.status === 'DRAFT') continue;
        yearsSet.add(e.academicYear);
        const termLabel = e.term ?? e.name;
        if (!termsByYear.has(e.academicYear)) termsByYear.set(e.academicYear, new Set());
        termsByYear.get(e.academicYear)!.add(termLabel);
      }

      const markRecords = marks.map((m) => {
        const max = m.exam.totalMarks ?? 100;
        const score = Number(m.score);
        const pct = max ? Math.round((score / max) * 1000) / 10 : null;
        return {
          id: m.id,
          title: m.exam.name,
          subject: m.subject.name,
          type: m.exam.type,
          score,
          maxScore: max,
          percentage: pct,
          grade: gradeFromScore(pct != null ? Math.round(pct) : score),
          date: m.exam.startDate?.toISOString() ?? m.createdAt.toISOString(),
          term: m.exam.term ?? m.exam.name,
          academicYear: m.exam.academicYear,
          status: m.exam.status,
        };
      });

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            fullName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
            className: enrollment?.class ? classLabel(enrollment.class) : null,
            stream: enrollment?.class?.stream ?? null,
          },
          terms,
          upcomingExams,
          markRecords,
          filters: {
            years: [...yearsSet].sort((a, b) => b.localeCompare(a)),
            termsByYear: Object.fromEntries(
              [...termsByYear.entries()].map(([y, set]) => [y, [...set].sort()])
            ),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: full student identity, medical + parent contact profile (ParentMIS). */
  async studentProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const studentCode =
        typeof req.query.studentCode === 'string' ? req.query.studentCode : undefined;

      if (!studentCode) throw new AppError(400, 'studentCode is required');

      const student = await prisma.student.findFirst({
        where: {
          organizationId,
          OR: [{ studentCode }, { studentUid: studentCode }],
        },
        include: {
          enrollments: {
            where: { isCurrent: true, status: 'ACTIVE' },
            include: { class: { include: { grade: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          studentParents: { include: { parent: true } },
        },
      });

      if (!student) throw new AppError(404, 'Student not found');

      const enrollment = student.enrollments[0];
      const parents = student.studentParents.map((sp) => ({
        role: sp.role,
        name: [sp.parent.firstName, sp.parent.lastName].filter(Boolean).join(' ').trim(),
        phone: sp.parent.phone ?? '',
        email: sp.parent.email ?? '',
        address: sp.parent.address ?? '',
      }));

      const byRole = (role: string) => parents.find((p) => p.role === role);

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            studentCode: student.studentCode || student.studentUid || student.id,
            fullName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
            firstName: student.firstName,
            lastName: student.lastName,
            gender: student.gender,
            dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
            nationality: student.nationality ?? null,
            bloodGroup: student.bloodGroup ?? null,
            allergies: student.allergies
              ? student.allergies.split(',').map((a) => a.trim()).filter(Boolean)
              : [],
            className: enrollment?.class ? classLabel(enrollment.class) : null,
            stream: enrollment?.class?.stream ?? null,
            academicYear: enrollment?.academicYear ?? null,
            photoUrl: resolvePhoto(student.studentPhoto),
            isBoarding: student.isBoarding === true,
          },
          parents: {
            father: byRole('FATHER') ?? null,
            mother: byRole('MOTHER') ?? null,
            guardians: parents.filter((p) => p.role === 'GUARDIAN'),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async tenantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
      if (!tenant) throw new AppError(404, 'Tenant not found');
      res.json({
        success: true,
        data: {
          organizationId: tenant.organizationId,
          organizationName: tenant.organizationName,
          organizationCode: tenant.organizationCode,
          district: tenant.district,
          schoolCode: tenant.schoolCode,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: resolve RFID owner school (no organizationId required). */
  async lookupRfidOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rfidUid = typeof req.query.rfidUid === 'string' ? req.query.rfidUid : '';
      if (!rfidUid.trim()) throw new AppError(400, 'rfidUid is required');
      const data = await studentService.lookupRfidOwner(rfidUid);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async lookupClassMonitor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const qrCode = typeof req.query.qrCode === 'string' ? req.query.qrCode : '';
      if (!qrCode.trim()) throw new AppError(400, 'qrCode is required');
      const { monitor, meta } = await classMonitorService.lookupByQr(organizationId, qrCode);
      res.json({ success: true, data: monitor, meta });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: apply bulk student photos from Print Card import worker. */
  async applyStudentPhotos(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const body = req.body as {
        existingPhotoPolicy?: 'ONLY_MISSING' | 'REPLACE';
        items?: Array<{
          studentId?: string;
          studentCode?: string;
          photoId?: string;
          fileName?: string;
          photoBase64?: string;
        }>;
      };
      const policy = body.existingPhotoPolicy === 'REPLACE' ? 'REPLACE' : 'ONLY_MISSING';
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) throw new AppError(400, 'items are required');

      const data = await studentService.applyPhotosFromImport(organizationId, policy, items);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async batchDashboardSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { organizationIds?: string[] };
      const ids = Array.isArray(body.organizationIds) ? body.organizationIds.filter(Boolean) : [];
      const unique = [...new Set(ids)];
      const rows = await Promise.all(
        unique.map(async (organizationId) => {
          try {
            const summary = await dashboardService.getSummary(organizationId);
            return {
              organizationId,
              ok: true,
              data: {
                studentCount: summary.studentCount,
                activeEnrollments: summary.activeEnrollments,
                classCount: summary.classCount,
                studentsByClass: summary.studentsByClass,
                studentsByCategory: summary.studentsByCategory,
                genderDistribution: summary.genderDistribution,
              },
            };
          } catch {
            return { organizationId, ok: false, data: null };
          }
        })
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  async dashboardSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef!;
      const summary = await dashboardService.getSummary(organizationId);
      res.json({
        success: true,
        data: {
          studentCount: summary.studentCount,
          activeEnrollments: summary.activeEnrollments,
          classCount: summary.classCount,
          studentsByClass: summary.studentsByClass,
          studentsByCategory: summary.studentsByCategory,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

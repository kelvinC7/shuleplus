import { Prisma, StudentStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { settingsService } from './settings.service';
import { getDistrictCode, formatStudentUid, previewStudentCodeParts, parseSchoolCodeNumeric } from '../utils/student-code';
import { normalizePhotoPath, withResolvedStudentPhoto } from '../utils/photo-url';

function normalizeYear(year: string): string {
  return year.replace(/\s/g, '').replace(/[–—]/g, '-');
}

function academicYearVariants(year?: string): string[] {
  if (!year?.trim()) return [];
  const y = normalizeYear(year.trim());
  const out = new Set<string>([year.trim(), y, y.replace(/-/g, '–'), y.replace(/-/g, '/')]);
  return [...out];
}

export type ImportRowInput = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: string | number;
  sdmCode?: string;
  className?: string;
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  nationality?: string;
};

function generateStudentUid(
  district: string | null,
  schoolCode: string | null,
  sequence: number,
  academicYear?: string | null
): string {
  const dCode = getDistrictCode(district);
  return formatStudentUid(dCode, schoolCode ?? '001', sequence, academicYear);
}

export class StudentService {
  /**
   * Next free ShuleCode sequence. Uses the max sequence already present in
   * studentUid (not the row count) so deleted students never cause collisions.
   */
  private async nextUidSequence(organizationId: string): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX(CAST(SUBSTRING(student_uid FROM 6 FOR 4) AS INTEGER)) AS max
      FROM students
      WHERE organization_id = ${organizationId} AND student_uid ~ '^[0-9]{11}$'
    `;
    const maxSeq = Number(rows?.[0]?.max ?? 0);
    const count = await prisma.student.count({ where: { organizationId } });
    return Math.max(maxSeq, count) + 1;
  }

  async nextCodePreview(organizationId: string, academicYear?: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    const sequence = await this.nextUidSequence(organizationId);
    const year = academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    return previewStudentCodeParts({
      district: tenant.district,
      schoolCode: tenant.schoolCode ?? tenant.organizationCode,
      sequence,
      academicYear: year,
    });
  }

  async register(
    organizationId: string,
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      gender?: string;
      dateOfBirth?: string;
      nationality?: string;
      province?: string;
      district?: string;
      sector?: string;
      cell?: string;
      village?: string;
      sdmCode?: string;
      rfidUid?: string;
      fingerprintId?: string;
      studentPhoto?: string;
      bloodGroup?: string;
      allergies?: string;
      hasMedicalCondition?: boolean;
      medicalConditionDetails?: string;
      fatherLiving?: boolean;
      motherLiving?: boolean;
      formerSchool?: string;
      leavingReason?: string;
      identityRemarks?: string;
      isBoarding?: boolean;
      classId: string;
      academicYear?: string;
      term?: string;
      joiningDate?: string;
      parents?: { parentId: string; role: 'FATHER' | 'MOTHER' | 'GUARDIAN' }[];
    }
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { organizationId },
    });
    if (!tenant) throw new AppError(404, 'Tenant not found');

    if (!data.classId?.trim()) {
      throw new AppError(400, 'Class is required. Select a class on the Academic tab before enrolling.');
    }

    const klass = await prisma.class.findFirst({
      where: { id: data.classId, organizationId },
    });
    if (!klass) {
      throw new AppError(400, 'Selected class was not found for this school. Open Academic tab and pick a valid class.');
    }

    const year =
      data.academicYear ??
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const sequence = await this.nextUidSequence(organizationId);
    const studentUid = generateStudentUid(
      tenant.district,
      tenant.schoolCode ?? tenant.organizationCode,
      sequence,
      year
    );

    const studentCode = studentUid;

    const student = await prisma.student.create({
      data: {
        organizationId,
        studentUid,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender as any,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        nationality: data.nationality,
        province: data.province,
        district: data.district,
        sector: data.sector,
        cell: data.cell,
        village: data.village,
        studentCode,
        sdmCode: data.sdmCode,
        rfidUid: data.rfidUid,
        fingerprintId: data.fingerprintId,
        studentPhoto: normalizePhotoPath(data.studentPhoto),
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        hasMedicalCondition: data.hasMedicalCondition ?? false,
        medicalConditionDetails: data.medicalConditionDetails,
        fatherLiving: data.fatherLiving ?? true,
        motherLiving: data.motherLiving ?? true,
        formerSchool: data.formerSchool,
        leavingReason: data.leavingReason,
        identityRemarks: data.identityRemarks,
        isBoarding: data.isBoarding ?? false,
        status: StudentStatus.ACTIVE,
      },
    });

    if (data.parents && data.parents.length > 0) {
      await prisma.studentParent.createMany({
        data: data.parents.map((p) => ({
          organizationId,
          studentId: student.id,
          parentId: p.parentId,
          role: p.role,
        })),
      });
    }

    await prisma.enrollment.create({
      data: {
        organizationId,
        studentId: student.id,
        classId: klass.id,
        academicYear: year,
        term: data.term,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
        isCurrent: true,
        recordedBy: userId,
      },
    });

    return this.getById(student.id, organizationId);
  }

  private normalizeGender(raw?: string): 'MALE' | 'FEMALE' | null {
    const g = (raw ?? '').trim().toLowerCase();
    if (!g) return null;
    if (g === 'm' || g === 'male' || g === 'm.' || g.startsWith('m')) return 'MALE';
    if (g === 'f' || g === 'female' || g === 'f.' || g.startsWith('f')) return 'FEMALE';
    return null;
  }

  private normalizePhone(raw?: string): { ok: boolean; value?: string; message?: string } {
    const v = (raw ?? '').trim();
    if (!v) return { ok: true };
    const digits = v.replace(/[\s\-()]/g, '');
    if (!/^(\+?250)?0?[7][0-9]{8}$/.test(digits) && !/^0[0-9]{9}$/.test(digits)) {
      return { ok: false, message: `Invalid phone: ${v}` };
    }
    return { ok: true, value: digits };
  }

  private parseDob(raw?: string): { ok: boolean; iso?: string; age?: number; message?: string } {
    const v = (raw ?? '').trim();
    if (!v) return { ok: true };
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return { ok: false, message: `Invalid date of birth: ${v}` };
    const iso = d.toISOString().slice(0, 10);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return { ok: true, iso, age };
  }

  private resolveClass(
    classes: Array<{ id: string; name: string; stream: string | null }>,
    className?: string
  ) {
    const raw = (className ?? '').trim().replace(/\s+/g, ' ');
    if (!raw) return null;
    const key = raw.toLowerCase();
    const compact = key.replace(/[\s._-]+/g, '');

    // Exact "Name Stream" or "Name" match
    for (const c of classes) {
      const label = c.stream ? `${c.name} ${c.stream}`.toLowerCase() : c.name.toLowerCase();
      const nameKey = c.name.toLowerCase();
      if (label === key || nameKey === key) return c;
      if (nameKey.replace(/[\s._-]+/g, '') === compact) return c;
      if (label.replace(/[\s._-]+/g, '') === compact) return c;
    }

    // "P1 A" → name P1, stream A
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      const stream = parts[parts.length - 1];
      const name = parts.slice(0, -1).join(' ');
      const hit = classes.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && (c.stream ?? '').toLowerCase() === stream.toLowerCase()
      );
      if (hit) return hit;
    }

    // "Primary 1" / "P 1" → prefer class named P1 when unique
    const primaryMatch = compact.match(/^p(?:rimary)?(\d+)$/);
    if (primaryMatch) {
      const alias = `p${primaryMatch[1]}`;
      const hits = classes.filter((c) => c.name.toLowerCase().replace(/[\s._-]+/g, '') === alias);
      if (hits.length === 1) return hits[0];
    }
    const nurseryMatch = compact.match(/^n(?:ursery)?(\d+)$/);
    if (nurseryMatch) {
      const alias = `n${nurseryMatch[1]}`;
      const hits = classes.filter((c) => c.name.toLowerCase().replace(/[\s._-]+/g, '') === alias);
      if (hits.length === 1) return hits[0];
    }
    const secondaryMatch = compact.match(/^s(?:econdary|enior)?(\d+)$/);
    if (secondaryMatch) {
      const alias = `s${secondaryMatch[1]}`;
      const hits = classes.filter((c) => c.name.toLowerCase().replace(/[\s._-]+/g, '') === alias);
      if (hits.length === 1) return hits[0];
    }

    return null;
  }

  private classLabel(c: { name: string; stream: string | null }) {
    return c.stream ? `${c.name} ${c.stream}` : c.name;
  }

  async previewImport(
    organizationId: string,
    input: {
      academicYear: string;
      term?: string;
      defaultClassId?: string;
      rows: ImportRowInput[];
    }
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');

    const classes = await prisma.class.findMany({ where: { organizationId } });
    const defaultClass = input.defaultClassId
      ? classes.find((c) => c.id === input.defaultClassId) ?? null
      : null;
    if (input.defaultClassId && !defaultClass) {
      throw new AppError(400, 'Selected default class was not found for this school.');
    }
    const existing = await prisma.student.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        sdmCode: true,
        studentUid: true,
        enrollments: {
          where: { isCurrent: true },
          select: { class: { select: { name: true, stream: true } } },
        },
      },
    });

    const bySdm = new Map(
      existing.filter((s) => s.sdmCode).map((s) => [s.sdmCode!.toLowerCase(), s] as const)
    );

    const reviewed = input.rows.map((row, idx) => {
      const rowNum = idx + 2;
      const issues: string[] = [];
      const firstName = row.firstName?.trim() ?? '';
      const lastName = row.lastName?.trim() ?? '';
      if (!firstName) issues.push('Missing First Name');
      if (!lastName) issues.push('Missing Last Name');

      const gender = this.normalizeGender(row.gender);
      if (row.gender?.trim() && !gender) issues.push('Gender must be Male or Female');

      const cls = row.className?.trim()
        ? this.resolveClass(classes, row.className)
        : defaultClass;
      if (row.className?.trim() && !cls) issues.push(`Unknown class: ${row.className}`);

      const dob = this.parseDob(row.dateOfBirth);
      if (!dob.ok) issues.push(dob.message!);

      const fatherPhone = this.normalizePhone(row.fatherPhone);
      const motherPhone = this.normalizePhone(row.motherPhone);
      if (!fatherPhone.ok) issues.push(fatherPhone.message!);
      if (!motherPhone.ok) issues.push(motherPhone.message!);

      let age = row.age != null && String(row.age).trim() !== '' ? Number(row.age) : undefined;
      if (dob.iso && dob.age != null) age = dob.age;
      if (age != null && (Number.isNaN(age) || age < 0 || age > 100)) {
        issues.push('Invalid Age');
        age = undefined;
      }

      const sdmCode = row.sdmCode?.trim() || '';
      let status: 'ready' | 'duplicate' | 'invalid' | 'review' = issues.length ? 'invalid' : 'ready';
      let reason = issues.length ? issues.join('; ') : 'Ready';
      let matchStudentId: string | undefined;

      if (status !== 'invalid' && sdmCode && bySdm.has(sdmCode.toLowerCase())) {
        status = 'duplicate';
        reason = 'SDMS Code Exists';
        matchStudentId = bySdm.get(sdmCode.toLowerCase())!.id;
      } else if (status !== 'invalid' && firstName && lastName) {
        const fn = firstName.toLowerCase();
        const ln = lastName.toLowerCase();
        if (dob.iso) {
          const hit = existing.find(
            (s) =>
              s.firstName.toLowerCase() === fn &&
              s.lastName.toLowerCase() === ln &&
              s.dateOfBirth &&
              s.dateOfBirth.toISOString().slice(0, 10) === dob.iso
          );
          if (hit) {
            status = 'duplicate';
            reason = 'Same Name + Date of Birth';
            matchStudentId = hit.id;
          }
        } else {
          const hit = existing.find((s) => {
            if (s.firstName.toLowerCase() !== fn || s.lastName.toLowerCase() !== ln) return false;
            const cur = s.enrollments[0]?.class;
            if (!cur || !row.className?.trim()) return false;
            const label = cur.stream ? `${cur.name} ${cur.stream}` : cur.name;
            return label.toLowerCase() === row.className!.trim().toLowerCase();
          });
          if (hit) {
            status = 'review';
            reason = 'Same Name + Class (no DOB) — Review Required';
            matchStudentId = hit.id;
          }
        }
      }

      return {
        row: rowNum,
        status,
        reason,
        matchStudentId,
        willGenerateShuleCode: true,
        firstName,
        lastName,
        gender: gender ?? undefined,
        dateOfBirth: dob.iso,
        age,
        sdmCode: sdmCode || undefined,
        className: row.className?.trim() || (cls ? this.classLabel(cls) : undefined),
        classId: cls?.id,
        fatherName: row.fatherName?.trim() || undefined,
        motherName: row.motherName?.trim() || undefined,
        fatherPhone: fatherPhone.value,
        motherPhone: motherPhone.value,
        district: row.district?.trim() || undefined,
        sector: row.sector?.trim() || undefined,
        cell: row.cell?.trim() || undefined,
        village: row.village?.trim() || undefined,
      };
    });

    const summary = {
      total: reviewed.length,
      ready: reviewed.filter((r) => r.status === 'ready').length,
      duplicates: reviewed.filter((r) => r.status === 'duplicate' || r.status === 'review').length,
      invalid: reviewed.filter((r) => r.status === 'invalid').length,
      autoGenerateSdms: reviewed.filter((r) => r.status === 'ready').length, // ShuleCodes to generate
      academicYear: input.academicYear,
      term: input.term || null,
    };

    return { summary, rows: reviewed };
  }

  async importBulk(
    organizationId: string,
    userId: string,
    rows: ImportRowInput[],
    options: {
      academicYear: string;
      term?: string;
      defaultClassId?: string;
      duplicateMode?: 'skip' | 'update';
      importValidOnly?: boolean;
      generateMissingSdms?: boolean;
    }
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    if (!options.academicYear?.trim()) throw new AppError(400, 'Academic year is required');

    const year = options.academicYear.trim();
    const term = options.term?.trim() || undefined;
    const duplicateMode = options.duplicateMode ?? 'skip';
    const importValidOnly = options.importValidOnly !== false;
    const generateMissingSdms = options.generateMissingSdms !== false;

    const preview = await this.previewImport(organizationId, {
      academicYear: year,
      term,
      defaultClassId: options.defaultClassId,
      rows,
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let generatedSdms = 0;
    const errors: Array<{ row: number; message: string }> = [];
    const createdStudents: Array<{ studentUid: string; name: string; sdmCode?: string }> = [];
    const started = Date.now();

    let nextSeq = await this.nextUidSequence(organizationId);

    for (const item of preview.rows) {
      try {
        if (item.status === 'invalid') {
          if (importValidOnly) {
            failed += 1;
            errors.push({ row: item.row, message: item.reason });
            continue;
          }
          throw new Error(item.reason);
        }

        if (item.status === 'duplicate' || item.status === 'review') {
          if (duplicateMode === 'skip') {
            skipped += 1;
            continue;
          }
          if (duplicateMode === 'update' && item.matchStudentId) {
            await prisma.student.update({
              where: { id: item.matchStudentId },
              data: {
                firstName: item.firstName,
                lastName: item.lastName,
                gender: item.gender as 'MALE' | 'FEMALE' | undefined,
                dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : undefined,
                district: item.district,
                sector: item.sector,
                cell: item.cell,
                village: item.village,
                sdmCode: item.sdmCode || undefined,
              },
            });
            if (item.classId) {
              await prisma.enrollment.updateMany({
                where: { studentId: item.matchStudentId, isCurrent: true },
                data: { isCurrent: false },
              });
              await prisma.enrollment.upsert({
                where: {
                  organizationId_studentId_academicYear: {
                    organizationId,
                    studentId: item.matchStudentId,
                    academicYear: year,
                  },
                },
                create: {
                  organizationId,
                  studentId: item.matchStudentId,
                  classId: item.classId,
                  academicYear: year,
                  term,
                  isCurrent: true,
                  recordedBy: userId,
                },
                update: {
                  classId: item.classId,
                  term,
                  isCurrent: true,
                },
              });
            }
            updated += 1;
            continue;
          }
          skipped += 1;
          continue;
        }

        // ready — ShuleCode (studentUid) always generated; SDMS left as provided or blank
        const sdmCode = item.sdmCode || undefined;

        const studentUid = generateStudentUid(
          tenant.district,
          tenant.schoolCode ?? tenant.organizationCode,
          nextSeq,
          year
        );
        nextSeq += 1;

        const student = await prisma.student.create({
          data: {
            organizationId,
            studentUid,
            studentCode: studentUid, // ShuleCode
            firstName: item.firstName,
            lastName: item.lastName,
            gender: item.gender as 'MALE' | 'FEMALE' | undefined,
            dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : null,
            nationality: 'Rwandan',
            district: item.district,
            sector: item.sector,
            cell: item.cell,
            village: item.village,
            sdmCode,
            status: StudentStatus.ACTIVE,
          },
        });

        generatedSdms += 1; // counts ShuleCodes generated

        if (item.classId) {
          await prisma.enrollment.create({
            data: {
              organizationId,
              studentId: student.id,
              classId: item.classId,
              academicYear: year,
              term,
              isCurrent: true,
              recordedBy: userId,
            },
          });
        }

        // Optional parent links (create if names/phones present)
        await this.attachImportParents(organizationId, student.id, item);

        created += 1;
        createdStudents.push({
          studentUid,
          name: `${student.firstName} ${student.lastName}`,
          sdmCode: student.sdmCode ?? undefined,
        });
      } catch (err) {
        failed += 1;
        errors.push({
          row: item.row,
          message: err instanceof Error ? err.message : 'Failed to import row',
        });
      }
    }

    return {
      total: rows.length,
      created,
      updated,
      skipped,
      failed,
      generatedSdms,
      durationMs: Date.now() - started,
      errors,
      students: createdStudents,
      summary: preview.summary,
      schoolCode: parseSchoolCodeNumeric(tenant.schoolCode ?? tenant.organizationCode),
      districtCode: getDistrictCode(tenant.district),
    };
  }

  private async attachImportParents(
    organizationId: string,
    studentId: string,
    item: {
      fatherName?: string;
      motherName?: string;
      fatherPhone?: string;
      motherPhone?: string;
    }
  ) {
    const links: Array<{ role: 'FATHER' | 'MOTHER'; name?: string; phone?: string }> = [
      { role: 'FATHER', name: item.fatherName, phone: item.fatherPhone },
      { role: 'MOTHER', name: item.motherName, phone: item.motherPhone },
    ];

    for (const link of links) {
      if (!link.name?.trim() && !link.phone) continue;
      const parts = (link.name ?? 'Parent Guardian').trim().split(/\s+/);
      const firstName = parts[0] || 'Parent';
      const lastName = parts.slice(1).join(' ') || 'Guardian';

      let parent = link.phone
        ? await prisma.parent.findFirst({ where: { organizationId, phone: link.phone } })
        : null;

      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            organizationId,
            firstName,
            lastName,
            phone: link.phone,
          },
        });
      }

      await prisma.studentParent.upsert({
        where: {
          organizationId_studentId_parentId: {
            organizationId,
            studentId,
            parentId: parent.id,
          },
        },
        create: {
          organizationId,
          studentId,
          parentId: parent.id,
          role: link.role,
        },
        update: { role: link.role },
      });
    }
  }

  async list(organizationId: string, query?: { classId?: string; status?: string; search?: string; academicYear?: string; rfidUid?: string }) {
    const where: Prisma.StudentWhereInput = { organizationId };

    if (query?.status) {
      where.status = query.status as StudentStatus;
    }

  if (query?.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { studentUid: { contains: query.search, mode: 'insensitive' } },
      { studentCode: { contains: query.search, mode: 'insensitive' } },
      { sdmCode: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query?.rfidUid) {
    const normalized = query.rfidUid.trim().toUpperCase();
    if (normalized) where.rfidUid = normalized;
  }

    let enrollmentIncludeWhere: Prisma.EnrollmentWhereInput = { isCurrent: true };

    if (query?.classId || query?.academicYear) {
      const settings = await settingsService.getAcademic(organizationId).catch(() => null);
      const isCurrentYear =
        !!query.academicYear &&
        !!settings?.currentAcademicYear &&
        normalizeYear(query.academicYear) === normalizeYear(settings.currentAcademicYear);

      const enrollmentWhere: Prisma.EnrollmentWhereInput = { status: 'ACTIVE' };
      if (query.classId) enrollmentWhere.classId = query.classId;
      if (query.academicYear && !isCurrentYear) {
        const years = academicYearVariants(query.academicYear);
        enrollmentWhere.academicYear = years.length === 1 ? years[0] : { in: years };
        enrollmentIncludeWhere = {
          academicYear: years.length === 1 ? years[0] : { in: years },
        };
      } else {
        enrollmentWhere.isCurrent = true;
        enrollmentIncludeWhere = { isCurrent: true };
      }

      let studentIds = await prisma.enrollment.findMany({
        where: { organizationId, ...enrollmentWhere },
        select: { studentId: true },
      });

      if (query.classId && studentIds.length === 0) {
        studentIds = await prisma.enrollment.findMany({
          where: { organizationId, classId: query.classId, status: 'ACTIVE' },
          select: { studentId: true },
        });
        enrollmentIncludeWhere = { classId: query.classId, status: 'ACTIVE' };
      }

      where.id = { in: studentIds.map((e) => e.studentId) };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        enrollments: {
          where: enrollmentIncludeWhere,
          include: { class: true },
        },
        studentParents: {
          include: { parent: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return students.map(withResolvedStudentPhoto);
  }

  async getById(id: string, organizationId: string) {
    const student = await prisma.student.findFirst({
      where: { id, organizationId },
      include: {
        enrollments: {
          include: { class: true },
          orderBy: { createdAt: 'desc' },
        },
        studentParents: {
          include: { parent: true },
        },
      },
    });
    if (!student) throw new AppError(404, 'Student not found');
    return withResolvedStudentPhoto(student);
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      gender: string;
      dateOfBirth: string;
      nationality: string;
      province: string;
      district: string;
      sector: string;
      cell: string;
      village: string;
      studentCode: string;
      sdmCode: string;
      studentPhoto: string;
      rfidUid: string;
      fingerprintId: string;
      identityRemarks: string;
      bloodGroup: string;
      allergies: string;
      hasMedicalCondition: boolean;
      medicalConditionDetails: string;
      fatherLiving: boolean;
      motherLiving: boolean;
      formerSchool: string;
      leavingReason: string;
      isBoarding: boolean;
      disciplineMarks: number;
      status: string;
      classId: string;
      academicYear: string;
      term: string;
      joiningDate: string;
      parents: { parentId: string; role: 'FATHER' | 'MOTHER' | 'GUARDIAN' }[];
    }>
  ) {
    const existing = await prisma.student.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new AppError(404, 'Student not found');

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.nationality !== undefined) updateData.nationality = data.nationality;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.cell !== undefined) updateData.cell = data.cell;
    if (data.village !== undefined) updateData.village = data.village;
    if (data.studentCode !== undefined) updateData.studentCode = data.studentCode;
    if (data.sdmCode !== undefined) updateData.sdmCode = data.sdmCode;
    if (data.studentPhoto !== undefined) updateData.studentPhoto = normalizePhotoPath(data.studentPhoto);
    if (data.rfidUid !== undefined) updateData.rfidUid = data.rfidUid;
    if (data.fingerprintId !== undefined) updateData.fingerprintId = data.fingerprintId;
    if (data.identityRemarks !== undefined) updateData.identityRemarks = data.identityRemarks;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
    if (data.allergies !== undefined) updateData.allergies = data.allergies;
    if (data.hasMedicalCondition !== undefined) updateData.hasMedicalCondition = data.hasMedicalCondition;
    if (data.medicalConditionDetails !== undefined) updateData.medicalConditionDetails = data.medicalConditionDetails;
    if (data.fatherLiving !== undefined) updateData.fatherLiving = data.fatherLiving;
    if (data.motherLiving !== undefined) updateData.motherLiving = data.motherLiving;
    if (data.formerSchool !== undefined) updateData.formerSchool = data.formerSchool;
    if (data.leavingReason !== undefined) updateData.leavingReason = data.leavingReason;
    if (data.isBoarding !== undefined) updateData.isBoarding = data.isBoarding;
    if (data.disciplineMarks !== undefined) updateData.disciplineMarks = data.disciplineMarks;
    if (data.status !== undefined) updateData.status = data.status;

    await prisma.student.update({
      where: { id },
      data: updateData,
    });

    if (data.parents) {
      await prisma.studentParent.deleteMany({ where: { studentId: id } });
      if (data.parents.length > 0) {
        await prisma.studentParent.createMany({
          data: data.parents.map((p) => ({
            organizationId,
            studentId: id,
            parentId: p.parentId,
            role: p.role,
          })),
        });
      }
    }

    if (data.classId?.trim()) {
      const klass = await prisma.class.findFirst({
        where: { id: data.classId, organizationId },
      });
      if (!klass) {
        throw new AppError(400, 'Selected class was not found for this school.');
      }
      const year =
        data.academicYear ??
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      await prisma.enrollment.updateMany({
        where: { studentId: id, organizationId, isCurrent: true },
        data: { isCurrent: false },
      });
      await prisma.enrollment.upsert({
        where: {
          organizationId_studentId_academicYear: {
            organizationId,
            studentId: id,
            academicYear: year,
          },
        },
        create: {
          organizationId,
          studentId: id,
          classId: klass.id,
          academicYear: year,
          term: data.term,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
          isCurrent: true,
        },
        update: {
          classId: klass.id,
          term: data.term,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
          isCurrent: true,
        },
      });
    }

    return this.getById(id, organizationId);
  }

  private normalizeRfidUid(uid: string | null | undefined): string | null {
    if (uid == null) return null;
    const trimmed = uid.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  async updateIdentity(
    id: string,
    organizationId: string,
    data: {
      rfidUid?: string | null;
      fingerprintId?: string | null;
      identityRemarks?: string | null;
    }
  ) {
    const existing = await prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Student not found');

    const rfidUid = data.rfidUid !== undefined ? this.normalizeRfidUid(data.rfidUid) : undefined;
    if (rfidUid) {
      const duplicate = await prisma.student.findFirst({
        where: {
          rfidUid,
          id: { not: id },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentCode: true,
          organizationId: true,
        },
      });
      if (duplicate) {
        const tenant = await prisma.tenant.findFirst({
          where: { organizationId: duplicate.organizationId, status: 'ACTIVE' },
          select: { organizationName: true, organizationCode: true },
        });
        const schoolName =
          tenant?.organizationName ?? tenant?.organizationCode ?? 'another school';
        const studentName = [duplicate.firstName, duplicate.lastName].filter(Boolean).join(' ').trim();
        throw new AppError(
          409,
          `Card ${rfidUid} is already assigned to ${studentName} (${duplicate.studentCode}) at ${schoolName}.`
        );
      }
    }

    await prisma.student.update({
      where: { id },
      data: {
        ...(rfidUid !== undefined ? { rfidUid } : {}),
        ...(data.fingerprintId !== undefined ? { fingerprintId: data.fingerprintId || null } : {}),
        ...(data.identityRemarks !== undefined ? { identityRemarks: data.identityRemarks || null } : {}),
      },
    });

    return this.getById(id, organizationId);
  }

  async updateStatus(id: string, organizationId: string, status: StudentStatus) {
    const existing = await prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Student not found');
    await prisma.student.update({ where: { id }, data: { status } });
    return this.getById(id, organizationId);
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Student not found');

    await prisma.studentParent.deleteMany({ where: { studentId: id } });
    await prisma.enrollment.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });
    return { message: 'Student deleted' };
  }

  /** Service lookup: who owns this RFID across all schools (gate device diagnostics). */
  async lookupRfidOwner(rfidUid: string) {
    const normalized = this.normalizeRfidUid(rfidUid);
    if (!normalized) return null;

    const student = await prisma.student.findFirst({
      where: { rfidUid: normalized, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentCode: true,
        rfidUid: true,
        organizationId: true,
      },
    });
    if (!student?.rfidUid) return null;

    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: student.organizationId, status: 'ACTIVE' },
      select: { organizationName: true, organizationCode: true },
    });

    return {
      kind: 'student' as const,
      organizationId: student.organizationId,
      organizationName: tenant?.organizationName ?? null,
      organizationCode: tenant?.organizationCode ?? null,
      id: student.id,
      studentId: student.id,
      code: student.studentCode,
      studentCode: student.studentCode,
      name: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
      rfidUid: student.rfidUid,
    };
  }

  async applyPhotosFromImport(
    organizationId: string,
    policy: 'ONLY_MISSING' | 'REPLACE',
    items: Array<{
      studentId?: string;
      studentCode?: string;
      photoId?: string;
      fileName?: string;
      photoBase64?: string;
    }>
  ) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const {
      processIdPhotoUpload,
      processedPhotoFilename,
    } = await import('./id-photo-processor.service');

    const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    let applied = 0;
    let skipped = 0;
    const failed: Array<{ studentId?: string; photoId?: string; message: string }> = [];

    for (const item of items) {
      try {
        const photoId = item.photoId?.trim().toUpperCase() || null;
        const studentCode = item.studentCode?.trim() || null;
        let student =
          (item.studentId
            ? await prisma.student.findFirst({
                where: { id: item.studentId, organizationId },
              })
            : null) ??
          (photoId
            ? await prisma.student.findFirst({
                where: { organizationId, photoId },
              })
            : null) ??
          (studentCode
            ? await prisma.student.findFirst({
                where: {
                  organizationId,
                  OR: [
                    { studentCode },
                    { studentUid: studentCode },
                    { sdmCode: studentCode },
                  ],
                },
              })
            : null);

        if (!student) {
          failed.push({
            studentId: item.studentId,
            photoId: photoId ?? undefined,
            message: 'Student not found',
          });
          continue;
        }

        if (policy === 'ONLY_MISSING' && student.studentPhoto?.trim()) {
          if (photoId && !student.photoId) {
            await prisma.student.update({
              where: { id: student.id },
              data: { photoId },
            });
          }
          skipped += 1;
          continue;
        }

        if (!item.photoBase64?.trim()) {
          failed.push({
            studentId: student.id,
            photoId: photoId ?? undefined,
            message: 'photoBase64 is required',
          });
          continue;
        }

        const buffer = Buffer.from(item.photoBase64, 'base64');
        const processed = await processIdPhotoUpload(buffer);
        const filename = processedPhotoFilename(item.fileName ?? photoId ?? student.studentCode ?? 'photo');
        const filePath = path.join(UPLOAD_DIR, filename);
        await fs.writeFile(filePath, processed.buffer);

        await prisma.student.update({
          where: { id: student.id },
          data: {
            studentPhoto: `/uploads/${filename}`,
            ...(photoId ? { photoId } : {}),
          },
        });
        applied += 1;
      } catch (err) {
        failed.push({
          studentId: item.studentId,
          photoId: item.photoId,
          message: err instanceof Error ? err.message : 'Apply failed',
        });
      }
    }

    return { applied, skipped, failed };
  }
}

export const studentService = new StudentService();

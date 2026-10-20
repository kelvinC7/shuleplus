import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { env } from "../config/env";
import {
  studentManagementClient,
  type StudentManagementStudent,
} from "./student-management-client.service";

export interface MeasurementInput {
  height?: string | number;
  weight?: string | number;
  chest?: string | number;
  waist?: string | number;
  hip?: string | number;
  shoulder?: string | number;
  leg?: string | number;
  sleeve?: string | number;
  shirtSize?: string;
  trouserSize?: string;
  skirtSize?: string;
  dressSize?: string;
  sweaterSize?: string;
  shoeSize?: string;
  sportSize?: string;
  hatSize?: string;
  beltSize?: string;
  /** Flexible size rows - schools only store what they use */
  sizes?: { id?: string; label: string; value: string }[];
}

export interface StudentInput {
  firstName: string;
  lastName: string;
  className?: string;
  academicYear?: string;
  academicStudentId?: string;
  gender?: string;
  phone?: string;
  notes?: string;
  profileMeta?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ChecklistItemInput {
  productId: string;
  variantId?: string;
  owned: boolean;
  quantity?: number;
}

interface RosterStudent {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
  gender?: string | null;
  studentCode?: string;
}

const AUTO_SYNC_TTL_MS = 30_000;

export class StudentsService {
  private lastAutoSyncAt = new Map<string, number>();

  private mapRosterStudent(hit: StudentManagementStudent): RosterStudent {
    return {
      id: hit.id,
      fullName: hit.fullName,
      firstName: hit.firstName,
      lastName: hit.lastName,
      className: hit.className ?? undefined,
      gender: hit.gender,
      studentCode: hit.studentCode,
    };
  }

  private async autoSyncIfNeeded(organizationId: string) {
    if (!env.STUDENT_MANAGEMENT_API_URL) return;
    const now = Date.now();
    const last = this.lastAutoSyncAt.get(organizationId) ?? 0;
    if (now - last < AUTO_SYNC_TTL_MS) return;
    try {
      await this.syncFromStudentManagement(organizationId);
      this.lastAutoSyncAt.set(organizationId, now);
    } catch {
      // Do not block reads when Student Management is temporarily unreachable.
    }
  }

  async list(
    organizationId: string,
    filters: { search?: string; className?: string } = {},
  ) {
    await this.autoSyncIfNeeded(organizationId);
    return prisma.uniformStudent.findMany({
      where: {
        organizationId,
        ...(filters.className ? { className: filters.className } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  firstName: { contains: filters.search, mode: "insensitive" },
                },
                { lastName: { contains: filters.search, mode: "insensitive" } },
                {
                  academicStudentId: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: { measurement: true, items: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(organizationId: string, input: StudentInput) {
    return prisma.uniformStudent.create({ data: { organizationId, ...input } });
  }

  async update(
    organizationId: string,
    id: string,
    input: Partial<StudentInput>,
  ) {
    const student = await prisma.uniformStudent.findFirst({
      where: { id, organizationId },
    });
    if (!student) throw new AppError(404, "Student not found");
    const { profileMeta, ...rest } = input;
    return prisma.uniformStudent.update({
      where: { id },
      data: {
        ...rest,
        ...(profileMeta !== undefined ? { profileMeta } : {}),
      },
    });
  }

  async getProfile(organizationId: string, id: string) {
    await this.autoSyncIfNeeded(organizationId);
    const student = await prisma.uniformStudent.findFirst({
      where: { id, organizationId },
      include: {
        measurement: true,
        items: { include: { product: true, variant: true } },
        distributions: {
          include: { variant: { include: { product: true } } },
          orderBy: { issuedAt: "desc" },
        },
        reservations: {
          include: { variant: true },
          orderBy: { reservedAt: "desc" },
        },
        sales: {
          include: { lines: true, payments: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!student) throw new AppError(404, "Student not found");
    return student;
  }

  async upsertMeasurement(
    organizationId: string,
    studentId: string,
    input: MeasurementInput,
  ) {
    const student = await prisma.uniformStudent.findFirst({
      where: { id: studentId, organizationId },
      include: { measurement: true },
    });
    if (!student) throw new AppError(404, "Student not found");

    const numericKeys = [
      "height",
      "weight",
      "chest",
      "waist",
      "hip",
      "shoulder",
      "leg",
      "sleeve",
    ] as const;
    const sizeKeys = [
      "shirtSize",
      "trouserSize",
      "skirtSize",
      "dressSize",
      "sweaterSize",
      "shoeSize",
      "sportSize",
      "hatSize",
      "beltSize",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of numericKeys) {
      if (input[key] !== undefined && input[key] !== "")
        data[key] = String(input[key]);
    }
    for (const key of sizeKeys) {
      if (input[key] !== undefined) data[key] = input[key] || null;
    }

    const sizes =
      input.sizes
        ?.map((row, i) => ({
          id: row.id || `sz-${Date.now()}-${i}`,
          label: row.label.trim(),
          value: row.value.trim(),
        }))
        .filter((row) => row.label && row.value) ?? undefined;

    if (sizes !== undefined) data.sizes = sizes;

    const year = new Date().getFullYear().toString();
    const snapshot = {
      year,
      at: new Date().toISOString(),
      sizes: sizes ?? student.measurement?.sizes ?? [],
    };
    const prevHistory = Array.isArray(student.measurement?.history)
      ? (student.measurement!.history as unknown[])
      : [];
    data.history = [
      ...prevHistory.filter((h) => (h as { year?: string })?.year !== year),
      snapshot,
    ];

    return prisma.studentMeasurement.upsert({
      where: { studentId },
      update: data,
      create: { organizationId, studentId, ...data },
    });
  }

  async setChecklist(
    organizationId: string,
    studentId: string,
    items: ChecklistItemInput[],
  ) {
    const student = await prisma.uniformStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) throw new AppError(404, "Student not found");

    await prisma.$transaction([
      prisma.studentUniformItem.deleteMany({
        where: { studentId, organizationId },
      }),
      prisma.studentUniformItem.createMany({
        data: items.map((item) => ({
          organizationId,
          studentId,
          productId: item.productId,
          variantId: item.variantId,
          owned: item.owned,
          quantity: item.quantity ?? 1,
        })),
      }),
    ]);

    return prisma.studentUniformItem.findMany({
      where: { studentId, organizationId },
      include: { product: true, variant: true },
    });
  }

  /** Looks up students from Student Management by name/code. */
  async academicSearch(
    organizationId: string,
    query: string,
  ): Promise<RosterStudent[]> {
    const { students } = await this.fetchRosterStudents(organizationId, query);
    return students;
  }

  async fetchRosterStudents(
    organizationId: string,
    search = "",
  ): Promise<{ ok: boolean; students: RosterStudent[] }> {
    const { ok, students } = await studentManagementClient.listStudents(
      organizationId,
      search,
    );
    return {
      ok,
      students: students.map((s) => this.mapRosterStudent(s)),
    };
  }

  /** @deprecated Alias for fetchRosterStudents */
  async fetchAcademicStudents(
    organizationId: string,
    search = "",
  ): Promise<{ ok: boolean; students: RosterStudent[] }> {
    return this.fetchRosterStudents(organizationId, search);
  }

  async academicAvailability(organizationId: string) {
    const configured = Boolean(env.STUDENT_MANAGEMENT_API_URL);
    if (!configured) {
      return { configured: false, reachable: false, studentCount: 0 };
    }
    const { ok, students } = await this.fetchRosterStudents(organizationId);
    return { configured: true, reachable: ok, studentCount: students.length };
  }

  private mapGender(gender?: string | null): string | undefined {
    if (!gender) return undefined;
    const g = gender.trim().toUpperCase();
    if (g === "M" || g === "MALE" || g === "BOY" || g === "BOYS") return "MALE";
    if (g === "F" || g === "FEMALE" || g === "GIRL" || g === "GIRLS")
      return "FEMALE";
    return gender;
  }

  /** Prefer Student Management student code (e.g. 04001000327), never the row UUID. */
  private shuleCodeOf(hit: RosterStudent): string {
    const code = hit.studentCode?.trim() || "";
    if (!code) return "";
    if (code === hit.id) return "";
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        code,
      )
    ) {
      return "";
    }
    return code;
  }

  /** Repair a Uniform student row that still stores SM UUID instead of ShuleCode. */
  async ensureShuleCode(organizationId: string, studentId: string) {
    const student = await prisma.uniformStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) return null;

    const meta =
      student.profileMeta &&
      typeof student.profileMeta === "object" &&
      !Array.isArray(student.profileMeta)
        ? (student.profileMeta as Record<string, unknown>)
        : {};
    const existingCode = String(
      meta.shuleCode ?? student.academicStudentId ?? "",
    ).trim();
    const looksLikeUuid =
      !existingCode ||
      existingCode === student.id ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        existingCode,
      );

    if (!looksLikeUuid) {
      return student;
    }

    const rosterId = String(
      meta.studentManagementId ?? meta.academicId ?? student.academicStudentId ?? "",
    );
    const { ok, students: roster } =
      await this.fetchRosterStudents(organizationId);
    if (!ok || !roster.length) return student;

    const hit =
      roster.find((s) => s.id === rosterId) ||
      roster.find((s) => s.id === student.academicStudentId) ||
      roster.find(
        (s) =>
          s.firstName?.toLowerCase() === student.firstName.toLowerCase() &&
          s.lastName?.toLowerCase() === student.lastName.toLowerCase() &&
          (s.className ?? "") === (student.className ?? ""),
      );

    if (!hit) return student;
    const shuleCode = this.shuleCodeOf(hit);
    if (!shuleCode) return student;

    return prisma.uniformStudent.update({
      where: { id: student.id },
      data: {
        academicStudentId: shuleCode,
        profileMeta: {
          ...meta,
          studentManagementId: hit.id,
          academicId: hit.id,
          shuleCode,
          studentCode: hit.studentCode ?? shuleCode,
        },
      },
    });
  }

  async syncFromStudentManagement(organizationId: string) {
    if (!env.STUDENT_MANAGEMENT_API_URL) {
      throw new AppError(
        400,
        "Student Management API is not configured on this server",
      );
    }
    const { ok, students: roster } =
      await this.fetchRosterStudents(organizationId);
    if (!ok) {
      throw new AppError(
        502,
        "Student Management module is unreachable. Check STUDENT_MANAGEMENT_API_URL and service key.",
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const hit of roster) {
      const firstName = (
        hit.firstName ??
        hit.fullName?.split(/\s+/)[0] ??
        ""
      ).trim();
      const lastName =
        (
          hit.lastName ??
          hit.fullName?.split(/\s+/).slice(1).join(" ") ??
          ""
        ).trim() || "Student";
      if (!firstName || !hit.id) {
        skipped += 1;
        continue;
      }

      const shuleCode = this.shuleCodeOf(hit);
      if (!shuleCode) {
        skipped += 1;
        continue;
      }

      const existing = await prisma.uniformStudent.findFirst({
        where: {
          organizationId,
          OR: [{ academicStudentId: hit.id }, { academicStudentId: shuleCode }],
        },
      });

      const prevMeta =
        existing?.profileMeta &&
        typeof existing.profileMeta === "object" &&
        !Array.isArray(existing.profileMeta)
          ? (existing.profileMeta as Record<string, unknown>)
          : {};

      const payload = {
        firstName,
        lastName,
        className: hit.className ?? undefined,
        academicStudentId: shuleCode,
        gender: this.mapGender(hit.gender),
        isActive: true,
        profileMeta: {
          ...prevMeta,
          studentManagementId: hit.id,
          academicId: hit.id,
          shuleCode,
          studentCode: hit.studentCode ?? shuleCode,
        },
      };

      if (existing) {
        await prisma.uniformStudent.update({
          where: { id: existing.id },
          data: payload,
        });
        updated += 1;
      } else {
        await prisma.uniformStudent.create({
          data: { organizationId, ...payload },
        });
        created += 1;
      }
    }

    return {
      fetched: roster.length,
      created,
      updated,
      skipped,
      students: await prisma.uniformStudent.findMany({
        where: { organizationId },
        include: { measurement: true, items: true },
        orderBy: { createdAt: "desc" },
      }),
    };
  }

  /** @deprecated Alias — manual sync endpoint still calls this name. */
  async syncFromAcademic(organizationId: string) {
    return this.syncFromStudentManagement(organizationId);
  }

  async bulkImport(organizationId: string, rows: StudentInput[]) {
    let created = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.firstName?.trim() || !row.lastName?.trim()) {
          throw new Error("First name and last name are required");
        }
        await prisma.uniformStudent.create({
          data: {
            organizationId,
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            className: row.className?.trim() || undefined,
            academicYear: row.academicYear?.trim() || undefined,
            gender: this.mapGender(row.gender),
            phone: row.phone?.trim() || undefined,
            isActive: row.isActive ?? true,
          },
        });
        created += 1;
      } catch (err) {
        failed += 1;
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : "Failed to import row",
        });
      }
    }

    return {
      total: rows.length,
      created,
      failed,
      errors,
      students: await this.list(organizationId),
    };
  }
}

export const studentsService = new StudentsService();

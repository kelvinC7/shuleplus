import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  AdmissionApplicationStatus,
  OrganizationStatus,
  OrganizationType,
  Prisma,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  ADMISSION_STATUS_FLOW,
  DEFAULT_ADMISSION_DOCUMENTS,
  type AdmissionDocumentDef,
} from '../constants/admission-documents';

const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

export interface AdmissionSettingsDto {
  enabled: boolean;
  applicationDeadline: string | null;
  estimatedFee: number | null;
  availablePlaces: Record<string, number>;
  requiredDocuments: AdmissionDocumentDef[];
  termsUrl: string | null;
  privacyUrl: string | null;
  welcomeMessage: string | null;
}

export interface PublicAdmissionConfig extends AdmissionSettingsDto {
  organizationId: string;
  organizationName: string;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

const EDUCATION_LEVEL_ORDER = ['Nursery', 'Primary', 'O-Level', 'A-Level', 'TVET'] as const;

function normalizeEducationLevels(levels: string[]): string[] {
  const set = new Set(levels.map((l) => l.trim()).filter(Boolean));
  return EDUCATION_LEVEL_ORDER.filter((l) => set.has(l));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function parsePlaces(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isNaN(n) && n >= 0) out[k] = n;
  }
  return out;
}

function parseDocList(value: unknown): AdmissionDocumentDef[] {
  if (!Array.isArray(value) || !value.length) return DEFAULT_ADMISSION_DOCUMENTS;
  return value.filter(
    (d): d is AdmissionDocumentDef =>
      typeof d === 'object' &&
      d !== null &&
      typeof (d as AdmissionDocumentDef).id === 'string' &&
      typeof (d as AdmissionDocumentDef).name === 'string',
  );
}

function mapSettings(
  row: {
    enabled: boolean;
    applicationDeadline: Date | null;
    estimatedFee: number | null;
    availablePlaces: unknown;
    requiredDocuments: unknown;
    termsUrl: string | null;
    privacyUrl: string | null;
    welcomeMessage: string | null;
  } | null,
): AdmissionSettingsDto {
  if (!row) {
    return {
      enabled: false,
      applicationDeadline: null,
      estimatedFee: null,
      availablePlaces: {},
      requiredDocuments: DEFAULT_ADMISSION_DOCUMENTS,
      termsUrl: null,
      privacyUrl: null,
      welcomeMessage: null,
    };
  }
  return {
    enabled: row.enabled,
    applicationDeadline: row.applicationDeadline?.toISOString() ?? null,
    estimatedFee: row.estimatedFee,
    availablePlaces: parsePlaces(row.availablePlaces),
    requiredDocuments: parseDocList(row.requiredDocuments),
    termsUrl: row.termsUrl,
    privacyUrl: row.privacyUrl,
    welcomeMessage: row.welcomeMessage,
  };
}

async function nextApplicationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;
  const latest = await prisma.admissionApplication.findFirst({
    where: { applicationNumber: { startsWith: prefix } },
    orderBy: { applicationNumber: 'desc' },
    select: { applicationNumber: true },
  });
  const lastSeq = latest
    ? Number.parseInt(latest.applicationNumber.slice(prefix.length), 10) || 0
    : 0;
  return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
}

function storeDocumentFile(
  organizationId: string,
  docId: string,
  fileName: string,
  contentBase64: string,
  mimeType: string,
): string {
  if (!ALLOWED_MIMES.has(mimeType)) {
    throw new AppError(400, `Unsupported file type: ${mimeType}. Use PDF, JPG, or PNG.`);
  }
  const buffer = Buffer.from(
    contentBase64.replace(/^data:[^;]+;base64,/, ''),
    'base64',
  );
  if (buffer.length > MAX_DOC_BYTES) {
    throw new AppError(400, 'File exceeds maximum size of 5 MB');
  }
  const ext =
    mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType.includes('jpeg') || mimeType.includes('jpg')
        ? 'jpg'
        : 'png';
  const safeName = (fileName ?? `${docId}.${ext}`).replace(/[^\w.\-()+]/g, '_');
  const dir = path.join(uploadRoot, 'admissions', organizationId);
  fs.mkdirSync(dir, { recursive: true });
  const stored = `${randomUUID()}-${docId}-${safeName}`;
  fs.writeFileSync(path.join(dir, stored), buffer);
  return `/uploads/admissions/${organizationId}/${stored}`;
}

export class AdmissionService {
  async ensureSettings(organizationId: string) {
    let settings = await prisma.schoolAdmissionSettings.findUnique({
      where: { organizationId },
    });
    if (!settings) {
      settings = await prisma.schoolAdmissionSettings.create({
        data: { organizationId },
      });
    }
    return settings;
  }

  async getSettingsForOrg(organizationId: string): Promise<AdmissionSettingsDto> {
    const settings = await this.ensureSettings(organizationId);
    return mapSettings(settings);
  }

  async updateSettingsForOrg(
    organizationId: string,
    input: Partial<AdmissionSettingsDto>,
  ): Promise<AdmissionSettingsDto> {
    await this.ensureSettings(organizationId);
    const updated = await prisma.schoolAdmissionSettings.update({
      where: { organizationId },
      data: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.applicationDeadline !== undefined
          ? {
              applicationDeadline: input.applicationDeadline
                ? new Date(input.applicationDeadline)
                : null,
            }
          : {}),
        ...(input.estimatedFee !== undefined ? { estimatedFee: input.estimatedFee } : {}),
        ...(input.availablePlaces !== undefined
          ? { availablePlaces: input.availablePlaces as Prisma.InputJsonValue }
          : {}),
        ...(input.requiredDocuments !== undefined
          ? { requiredDocuments: input.requiredDocuments as unknown as Prisma.InputJsonValue }
          : {}),
        ...(input.termsUrl !== undefined ? { termsUrl: input.termsUrl } : {}),
        ...(input.privacyUrl !== undefined ? { privacyUrl: input.privacyUrl } : {}),
        ...(input.welcomeMessage !== undefined ? { welcomeMessage: input.welcomeMessage } : {}),
      },
    });
    return mapSettings(updated);
  }

  async getPublicConfig(organizationId: string): Promise<PublicAdmissionConfig> {
    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        type: OrganizationType.SCHOOL,
        status: OrganizationStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        schoolProfile: {
          select: {
            educationLevels: true,
            aLevelCombinations: true,
            tvetTrades: true,
            academicSettings: true,
            academicYear: true,
          },
        },
        admissionSettings: true,
      },
    });
    if (!org) throw new AppError(404, 'School not found');

    const academicSettings = org.schoolProfile?.academicSettings as
      | { academicYears?: string[]; terms?: string[]; currentAcademicYear?: string; currentTerm?: string }
      | null
      | undefined;

    const settings = mapSettings(org.admissionSettings);
    if (!settings.enabled) throw new AppError(403, 'Admissions are not open for this school');

    return {
      ...settings,
      organizationId: org.id,
      organizationName: org.name,
      educationLevels: normalizeEducationLevels(toStringArray(org.schoolProfile?.educationLevels)),
      aLevelCombinations: toStringArray(org.schoolProfile?.aLevelCombinations),
      tvetTrades: toStringArray(org.schoolProfile?.tvetTrades),
      academicYears: academicSettings?.academicYears?.length
        ? academicSettings.academicYears
        : org.schoolProfile?.academicYear
          ? [org.schoolProfile.academicYear]
          : [`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`],
      terms: academicSettings?.terms?.length ? academicSettings.terms : ['Term 1', 'Term 2', 'Term 3'],
      currentAcademicYear: academicSettings?.currentAcademicYear ?? org.schoolProfile?.academicYear ?? null,
      currentTerm: academicSettings?.currentTerm ?? null,
    };
  }

  async isAdmissionsEnabled(organizationId: string): Promise<boolean> {
    const settings = await prisma.schoolAdmissionSettings.findUnique({
      where: { organizationId },
      select: { enabled: true },
    });
    return settings?.enabled ?? false;
  }

  async listApplicationsForOrg(organizationId: string, status?: string) {
    const where: { organizationId: string; status?: AdmissionApplicationStatus } = {
      organizationId,
    };
    if (status && Object.values(AdmissionApplicationStatus).includes(status as AdmissionApplicationStatus)) {
      where.status = status as AdmissionApplicationStatus;
    }

    const rows = await prisma.admissionApplication.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((r) => this.serializeApplication(r));
  }

  async getApplicationForOrg(organizationId: string, applicationId: string) {
    const row = await prisma.admissionApplication.findFirst({
      where: { id: applicationId, organizationId },
    });
    if (!row) throw new AppError(404, 'Application not found');
    return this.serializeApplication(row);
  }

  async updateApplicationStatus(
    organizationId: string,
    applicationId: string,
    status: AdmissionApplicationStatus,
    extras?: { schoolNotes?: string; interviewAt?: string | null },
  ) {
    const existing = await prisma.admissionApplication.findFirst({
      where: { id: applicationId, organizationId },
    });
    if (!existing) throw new AppError(404, 'Application not found');

    const updated = await prisma.admissionApplication.update({
      where: { id: applicationId },
      data: {
        status,
        ...(extras?.schoolNotes !== undefined ? { schoolNotes: extras.schoolNotes } : {}),
        ...(extras?.interviewAt !== undefined
          ? { interviewAt: extras.interviewAt ? new Date(extras.interviewAt) : null }
          : {}),
      },
    });
    return this.serializeApplication(updated);
  }

  async trackByNumber(applicationNumber: string) {
    const row = await prisma.admissionApplication.findUnique({
      where: { applicationNumber },
      include: { organization: { select: { name: true } } },
    });
    if (!row) throw new AppError(404, 'Application not found');
    return this.serializeApplication(row, row.organization.name);
  }

  async saveDraft(input: {
    organizationId: string;
    draftToken?: string;
    payload: Record<string, unknown>;
  }) {
    const config = await this.getPublicConfig(input.organizationId);
    const token = input.draftToken ?? randomUUID();
    const p = input.payload;

    const data = {
      organizationId: input.organizationId,
      draftToken: token,
      status: AdmissionApplicationStatus.SUBMITTED,
      admissionLevel: String(p.admissionLevel ?? ''),
      classApplying: String(p.classApplying ?? ''),
      academicYear: String(p.academicYear ?? config.currentAcademicYear ?? ''),
      termOfEntry: String(p.termOfEntry ?? config.currentTerm ?? ''),
      boardingPreference: String(p.boardingPreference ?? 'Day'),
      studentGender: String(p.studentGender ?? ''),
      previousSchool: p.previousSchool ? String(p.previousSchool) : null,
      preferredCombination: p.preferredCombination ? String(p.preferredCombination) : null,
      admissionType: String(p.admissionType ?? 'New Student'),
      studentDetails: (p.studentDetails ?? {}) as object,
      parentDetails: (p.parentDetails ?? {}) as object,
      documents: (p.documents ?? []) as object,
      confirmAccurate: false,
      acceptTerms: false,
      submittedAt: null as Date | null,
    };

    if (input.draftToken) {
      const existing = await prisma.admissionApplication.findFirst({
        where: { draftToken: input.draftToken, organizationId: input.organizationId },
      });
      if (existing) {
        const updated = await prisma.admissionApplication.update({
          where: { id: existing.id },
          data,
        });
        return { draftToken: token, application: this.serializeApplication(updated) };
      }
    }

    const applicationNumber = await nextApplicationNumber();
    const created = await prisma.admissionApplication.create({
      data: {
        ...data,
        applicationNumber,
      },
    });
    return { draftToken: token, application: this.serializeApplication(created) };
  }

  async submitApplication(input: {
    organizationId: string;
    draftToken?: string;
    admissionLevel: string;
    classApplying: string;
    academicYear: string;
    termOfEntry: string;
    boardingPreference: string;
    studentGender: string;
    previousSchool?: string;
    preferredCombination?: string;
    admissionType: string;
    studentDetails: Record<string, unknown>;
    parentDetails: Record<string, unknown>;
    documents: Array<{
      id: string;
      fileName?: string;
      contentBase64?: string;
      mimeType?: string;
      url?: string;
    }>;
    confirmAccurate: boolean;
    acceptTerms: boolean;
  }) {
    await this.getPublicConfig(input.organizationId);

    if (!input.confirmAccurate || !input.acceptTerms) {
      throw new AppError(400, 'You must confirm the information and accept the terms');
    }

    const storedDocs = input.documents.map((doc) => {
      if (doc.url) return { id: doc.id, url: doc.url, fileName: doc.fileName ?? doc.id };
      if (doc.contentBase64 && doc.mimeType) {
        const url = storeDocumentFile(
          input.organizationId,
          doc.id,
          doc.fileName ?? doc.id,
          doc.contentBase64,
          doc.mimeType,
        );
        return { id: doc.id, url, fileName: doc.fileName ?? doc.id };
      }
      return { id: doc.id, url: null, fileName: doc.fileName ?? doc.id };
    });

    const baseData = {
      admissionLevel: input.admissionLevel,
      classApplying: input.classApplying,
      academicYear: input.academicYear,
      termOfEntry: input.termOfEntry,
      boardingPreference: input.boardingPreference,
      studentGender: input.studentGender,
      previousSchool: input.previousSchool ?? null,
      preferredCombination: input.preferredCombination ?? null,
      admissionType: input.admissionType,
      studentDetails: input.studentDetails as object,
      parentDetails: input.parentDetails as object,
      documents: storedDocs as object,
      confirmAccurate: true,
      acceptTerms: true,
      submittedAt: new Date(),
      status: AdmissionApplicationStatus.SUBMITTED,
    };

    if (input.draftToken) {
      const existing = await prisma.admissionApplication.findFirst({
        where: { draftToken: input.draftToken, organizationId: input.organizationId },
      });
      if (existing) {
        const updated = await prisma.admissionApplication.update({
          where: { id: existing.id },
          data: baseData,
          include: { organization: { select: { name: true } } },
        });
        return this.serializeApplication(updated, updated.organization.name);
      }
    }

    const applicationNumber = await nextApplicationNumber();
    const created = await prisma.admissionApplication.create({
      data: {
        ...baseData,
        organizationId: input.organizationId,
        applicationNumber,
        draftToken: input.draftToken ?? null,
      },
      include: { organization: { select: { name: true } } },
    });
    return this.serializeApplication(created, created.organization.name);
  }

  private serializeApplication(
    row: {
      id: string;
      applicationNumber: string;
      organizationId: string;
      status: AdmissionApplicationStatus;
      draftToken: string | null;
      admissionLevel: string;
      classApplying: string;
      academicYear: string;
      termOfEntry: string;
      boardingPreference: string;
      studentGender: string;
      previousSchool: string | null;
      preferredCombination: string | null;
      admissionType: string;
      studentDetails: unknown;
      parentDetails: unknown;
      documents: unknown;
      confirmAccurate: boolean;
      acceptTerms: boolean;
      schoolNotes: string | null;
      interviewAt: Date | null;
      submittedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationName?: string,
  ) {
    const student = row.studentDetails as { firstName?: string; lastName?: string };
    const statusIndex = ADMISSION_STATUS_FLOW.indexOf(
      row.status as (typeof ADMISSION_STATUS_FLOW)[number],
    );

    return {
      id: row.id,
      applicationNumber: row.applicationNumber,
      organizationId: row.organizationId,
      organizationName: organizationName ?? null,
      status: row.status,
      statusIndex: statusIndex >= 0 ? statusIndex : 0,
      draftToken: row.draftToken,
      admissionLevel: row.admissionLevel,
      classApplying: row.classApplying,
      academicYear: row.academicYear,
      termOfEntry: row.termOfEntry,
      boardingPreference: row.boardingPreference,
      studentGender: row.studentGender,
      previousSchool: row.previousSchool,
      preferredCombination: row.preferredCombination,
      admissionType: row.admissionType,
      studentDetails: row.studentDetails,
      parentDetails: row.parentDetails,
      documents: row.documents,
      confirmAccurate: row.confirmAccurate,
      acceptTerms: row.acceptTerms,
      schoolNotes: row.schoolNotes,
      interviewAt: row.interviewAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      studentName: [student?.firstName, student?.lastName].filter(Boolean).join(' ') || null,
    };
  }
}

export const admissionService = new AdmissionService();

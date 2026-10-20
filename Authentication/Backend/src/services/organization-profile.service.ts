import { OrganizationStatus, OrganizationType, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { RegistrationPayload } from './organization-registration.service';
import { parseAcademicSettings } from '../utils/academic-settings';

function postalFromRegistrationPayloadJson(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = (payload as { postalAddress?: unknown }).postalAddress;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

function resolveOrganizationPostal(org: {
  poBox?: string | null;
  registration?: { payload: unknown } | null;
}): string | null {
  return org.poBox?.trim() || postalFromRegistrationPayloadJson(org.registration?.payload) || null;
}

function parseGpsCoordinates(raw?: string | null): { lat: number | null; lng: number | null } {
  if (!raw?.trim()) return { lat: null, lng: null };
  const parts = raw
    .trim()
    .split(/[,;\s]+/)
    .map((p) => Number.parseFloat(p))
    .filter((n) => Number.isFinite(n));
  if (parts.length < 2) return { lat: null, lng: null };
  return { lat: parts[0], lng: parts[1] };
}

function mapOwnership(ownership?: string | null, schoolCategory?: string | null) {
  const raw = (ownership ?? schoolCategory ?? '').toLowerCase();
  if (raw.includes('private')) return 'PRIVATE';
  if (raw.includes('aided')) return 'GOVERNMENT_AIDED';
  if (raw.includes('public') || raw.includes('government')) return 'GOVERNMENT';
  return 'GOVERNMENT';
}

const SCHOOL_TYPES: OrganizationType[] = [
  OrganizationType.SCHOOL,
  OrganizationType.TVET,
  OrganizationType.UNIVERSITY,
];

export class OrganizationProfileService {
  /** National modules: registered schools only (ACTIVE by default). */
  async listRegisteredSchools(query: {
    status?: string;
    type?: string;
    province?: string;
    provinceId?: string;
    district?: string;
    districtId?: string;
    sector?: string;
    sectorId?: string;
    search?: string;
    limit?: number;
  }) {
    const status = (query.status?.toUpperCase() as OrganizationStatus | undefined) ?? OrganizationStatus.ACTIVE;
    const requestedType = query.type?.toUpperCase() as OrganizationType | undefined;
    const types =
      requestedType && SCHOOL_TYPES.includes(requestedType) ? [requestedType] : SCHOOL_TYPES;

    const where: Prisma.OrganizationWhereInput = {
      type: { in: types },
      status,
      slug: { not: 'babyeyi-platform' },
    };

    if (query.provinceId) {
      where.provinceId = query.provinceId;
    } else if (query.province) {
      where.province = { name: { equals: query.province, mode: 'insensitive' } };
    }
    if (query.districtId) {
      where.districtId = query.districtId;
    } else if (query.district) {
      where.district = { name: { equals: query.district, mode: 'insensitive' } };
    }
    const locationFilters: Prisma.OrganizationWhereInput[] = [];
    if (query.sectorId) {
      locationFilters.push({
        OR: [{ sectorId: query.sectorId }, { cell: { sectorId: query.sectorId } }],
      });
    } else if (query.sector?.trim()) {
      const sectorName = query.sector.trim();
      locationFilters.push({ sector: { name: { equals: sectorName, mode: 'insensitive' } } });
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      locationFilters.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { organizationCode: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (locationFilters.length) {
      const existingAnd = where.AND;
      const andList = Array.isArray(existingAnd)
        ? existingAnd
        : existingAnd
          ? [existingAnd]
          : [];
      where.AND = [...andList, ...locationFilters];
    }

    const limit = Math.min(Math.max(query.limit ?? 500, 1), 1000);
    const rows = await prisma.organization.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        schoolProfile: true,
        registration: { select: { payload: true } },
        province: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        cell: { select: { id: true, name: true } },
        village: { select: { id: true, name: true } },
      },
    });

    return rows.map((org) => {
      const gps = parseGpsCoordinates(org.gpsCoordinates);
      return {
      id: org.id,
      organizationCode: org.organizationCode,
      name: org.name,
      lat: gps.lat,
      lng: gps.lng,
      type: org.type,
      category: org.category,
      status: org.status,
      email: org.email,
      phone: org.phone,
      poBox: resolveOrganizationPostal(org),
      website: org.website ?? null,
      address: org.physicalAddress ?? org.address,
      logoUrl: org.logoUrl,
      province: org.province?.name ?? null,
      district: org.district?.name ?? null,
      sector: org.sector?.name ?? null,
      cell: org.cell?.name ?? null,
      village: org.village?.name ?? null,
      ownershipType: mapOwnership(org.schoolProfile?.ownership, org.schoolProfile?.schoolCategory),
      schoolCategory: org.schoolProfile?.schoolCategory ?? null,
      schoolProgram: org.schoolProfile?.schoolProgram ?? null,
      educationLevels: org.schoolProfile?.educationLevels ?? [],
      principalName: org.schoolProfile?.principalName ?? null,
      createdAt: org.createdAt,
    };
    });
  }

  async getOrganizationProfile(organizationId: string) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        schoolProfile: true,
        province: true,
        district: true,
        sector: true,
        cell: true,
        village: true,
        registration: { select: { payload: true } },
      },
    });

    if (!organization) {
      throw new AppError(404, 'Organization not found');
    }

    const payload = (organization.registration?.payload ?? {}) as RegistrationPayload;
    const school = organization.schoolProfile;

    return {
      organizationId: organization.id,
      organizationCode: organization.organizationCode,
      schoolName: organization.name,
      email: organization.email,
      phone: organization.phone,
      poBox: resolveOrganizationPostal(organization),
      website: organization.website,
      address: organization.physicalAddress ?? organization.address,
      country: organization.country,
      province: organization.province?.name ?? null,
      district: organization.district?.name ?? null,
      sector: organization.sector?.name ?? null,
      cell: organization.cell?.name ?? null,
      village: organization.village?.name ?? null,
      logoUrl: organization.logoUrl,
      signatureUrl: organization.signatureUrl,
      stampUrl: organization.stampUrl,
      ownershipType: mapOwnership(school?.ownership, school?.schoolCategory),
      schoolCategory: school?.schoolCategory ?? null,
      schoolProgram: school?.schoolProgram ?? null,
      educationLevels: school?.educationLevels ?? [],
      academicYear: school?.academicYear ?? null,
      academicSettings: parseAcademicSettings(school?.academicSettings),
      curriculum: school?.curriculum ?? null,
      schoolMotto: school?.schoolMotto ?? null,
      description: payload.description ? String(payload.description) : null,
      schoolShift: school?.schoolShift ?? null,
      principalName: school?.principalName ?? (payload.organizationHead ? String(payload.organizationHead) : null),
      deputyHeadName: school?.deputyHeadName ?? (payload.deputyHead ? String(payload.deputyHead) : null),
      bursarName: school?.bursarName ?? (payload.bursar ? String(payload.bursar) : null),
      secretaryName: school?.secretaryName ?? (payload.secretary ? String(payload.secretary) : null),
      leadershipPhone: school?.leadershipPhone ?? (payload.headPhone ? String(payload.headPhone) : null),
      leadershipEmail: school?.leadershipEmail ?? (payload.headEmail ? String(payload.headEmail) : null),
      leaders: [
        school?.principalName || payload.organizationHead
          ? {
              name: String(school?.principalName ?? payload.organizationHead),
              role: 'Head Teacher',
              phone: String(school?.leadershipPhone ?? payload.headPhone ?? ''),
              email: String(school?.leadershipEmail ?? payload.headEmail ?? ''),
            }
          : null,
        school?.deputyHeadName || payload.deputyHead
          ? {
              name: String(school?.deputyHeadName ?? payload.deputyHead),
              role: 'Deputy Head Teacher',
              phone: '',
              email: '',
            }
          : null,
        school?.bursarName || payload.bursar
          ? {
              name: String(school?.bursarName ?? payload.bursar),
              role: 'Accountant',
              phone: '',
              email: '',
            }
          : null,
        school?.secretaryName || payload.secretary
          ? {
              name: String(school?.secretaryName ?? payload.secretary),
              role: 'Secretary',
              phone: '',
              email: '',
            }
          : null,
      ].filter(Boolean),
    };
  }
}

export const organizationProfileService = new OrganizationProfileService();

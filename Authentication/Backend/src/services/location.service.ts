import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class LocationService {
  async listProvinces() {
    return prisma.province.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async listDistricts(provinceId: string) {
    return prisma.district.findMany({
      where: { provinceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, provinceId: true },
    });
  }

  async listSectors(districtId: string) {
    return prisma.sector.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, districtId: true },
    });
  }

  async listCells(sectorId: string) {
    return prisma.cell.findMany({
      where: { sectorId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sectorId: true },
    });
  }

  async listVillages(cellId: string) {
    return prisma.village.findMany({
      where: { cellId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, cellId: true },
    });
  }

  async getDistrictById(districtId: string) {
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new AppError(404, 'District not found');
    return district;
  }

  async getProvinceByName(name: string) {
    return prisma.province.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
      select: { id: true, name: true, code: true },
    });
  }

  async getDistrictByName(name: string, provinceId?: string) {
    return prisma.district.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        provinceId: provinceId || undefined,
      },
      select: { id: true, name: true, code: true, provinceId: true },
    });
  }

  async getSectorByName(name: string, districtId?: string) {
    return prisma.sector.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        districtId: districtId || undefined,
      },
      select: { id: true, name: true, districtId: true },
    });
  }

  async getCellByName(name: string, sectorId?: string) {
    return prisma.cell.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        sectorId: sectorId || undefined,
      },
      select: { id: true, name: true, sectorId: true },
    });
  }

  async getVillageByName(name: string, cellId?: string) {
    return prisma.village.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        cellId: cellId || undefined,
      },
      select: { id: true, name: true, cellId: true },
    });
  }

  async previewOrganizationCode(districtId: string) {
    const district = await this.getDistrictById(districtId);
    const counter = await prisma.districtOrgCounter.findUnique({
      where: { districtId },
    });
    const nextSerial = (counter?.lastSerial ?? 0) + 1;
    // Format: district (2 digits) + school serial (3 digits) → e.g. 01001
    const districtCode = district.code.padStart(2, '0');
    const schoolSerial = String(nextSerial).padStart(3, '0');
    const code = `${districtCode}${schoolSerial}`;
    return {
      organizationCode: code,
      districtCode,
      schoolSerial,
      districtName: district.name,
      nextSerial,
      formatted: `${districtCode}-${schoolSerial}`,
    };
  }

  async allocateOrganizationCode(districtId: string): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const district = await tx.district.findUniqueOrThrow({ where: { id: districtId } });
      const counter = await tx.districtOrgCounter.upsert({
        where: { districtId },
        update: { lastSerial: { increment: 1 } },
        create: { districtId, lastSerial: 1 },
      });
      // Format: district (2 digits) + school serial (3 digits) → e.g. 01001
      return `${district.code.padStart(2, '0')}${String(counter.lastSerial).padStart(3, '0')}`;
    });
  }
}

export const locationService = new LocationService();

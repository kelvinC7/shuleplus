import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../../src/generated/prisma';
import {
  districtCodeForName,
  provinceCode,
  titleCaseProvince,
  type RwandaLocationRow,
} from '../seeds/rwanda-location-codes';

const DATA_FILE = path.join(__dirname, '../data/rwanda-locations.json');
const BATCH_SIZE = 2000;

export async function importRwandaLocations(prisma: PrismaClient, options?: { resetHierarchy?: boolean }) {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(
      `Missing ${DATA_FILE}. Download from https://github.com/jnkindi/rwanda-locations-json/raw/master/locations.json`
    );
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const rows = JSON.parse(raw) as RwandaLocationRow[];

  console.log(`[Import] Loaded ${rows.length.toLocaleString()} village records from JSON`);

  if (options?.resetHierarchy ?? true) {
    console.log('[Import] Clearing existing sector/cell/village data…');
    await prisma.organization.updateMany({
      data: {
        provinceId: null,
        districtId: null,
        sectorId: null,
        cellId: null,
        villageId: null,
      },
    });
    await prisma.village.deleteMany();
    await prisma.cell.deleteMany();
    await prisma.sector.deleteMany();
  }

  const provinceIds = new Map<string, string>();
  const districtIds = new Map<string, string>();

  for (const row of rows) {
    const provinceName = titleCaseProvince(row.province_name);
    if (!provinceIds.has(provinceName)) {
      const province = await prisma.province.upsert({
        where: { name: provinceName },
        update: { code: provinceCode(provinceName) },
        create: { name: provinceName, code: provinceCode(provinceName) },
      });
      provinceIds.set(provinceName, province.id);
    }

    const districtCode = districtCodeForName(row.district_name);
    if (!districtCode) {
      console.warn(`[Import] Unknown district: ${row.district_name}`);
      continue;
    }

    if (!districtIds.has(districtCode)) {
      const provinceId = provinceIds.get(provinceName)!;
      const district = await prisma.district.upsert({
        where: { code: districtCode },
        update: { name: row.district_name, provinceId },
        create: { name: row.district_name, code: districtCode, provinceId },
      });
      districtIds.set(districtCode, district.id);

      await prisma.districtOrgCounter.upsert({
        where: { districtId: district.id },
        update: {},
        create: { districtId: district.id, lastSerial: 0 },
      });
    }
  }

  console.log(`[Import] Provinces: ${provinceIds.size}, Districts: ${districtIds.size}`);

  const sectorKeyToDistrictCode = new Map<string, string>();
  const sectorNames = new Map<string, string>();
  for (const row of rows) {
    const districtCode = districtCodeForName(row.district_name);
    if (!districtCode) continue;
    const key = `${districtCode}::${row.sector_name}`;
    sectorKeyToDistrictCode.set(key, districtCode);
    sectorNames.set(key, row.sector_name);
  }

  const sectorInserts: { districtId: string; name: string; key: string }[] = [];
  for (const [key, districtCode] of sectorKeyToDistrictCode) {
    const districtId = districtIds.get(districtCode);
    if (!districtId) continue;
    sectorInserts.push({ districtId, name: sectorNames.get(key)!, key });
  }

  for (let i = 0; i < sectorInserts.length; i += BATCH_SIZE) {
    const batch = sectorInserts.slice(i, i + BATCH_SIZE);
    await prisma.sector.createMany({
      data: batch.map(({ districtId, name }) => ({ districtId, name })),
      skipDuplicates: true,
    });
  }

  const sectorIdByKey = new Map<string, string>();
  const allSectors = await prisma.sector.findMany({
    select: { id: true, name: true, districtId: true },
  });
  const districtCodeById = new Map<string, string>();
  for (const [code, id] of districtIds) districtCodeById.set(id, code);

  for (const s of allSectors) {
    const code = districtCodeById.get(s.districtId);
    if (code) sectorIdByKey.set(`${code}::${s.name}`, s.id);
  }

  console.log(`[Import] Sectors: ${sectorIdByKey.size}`);

  const cellKeys = new Map<string, { sectorKey: string; name: string }>();
  for (const row of rows) {
    const districtCode = districtCodeForName(row.district_name);
    if (!districtCode) continue;
    const sectorKey = `${districtCode}::${row.sector_name}`;
    const cellKey = `${sectorKey}::${row.cell_name}`;
    cellKeys.set(cellKey, { sectorKey, name: row.cell_name });
  }

  const cellInserts: { sectorId: string; name: string; key: string }[] = [];
  for (const [cellKey, { sectorKey, name }] of cellKeys) {
    const sectorId = sectorIdByKey.get(sectorKey);
    if (!sectorId) continue;
    cellInserts.push({ sectorId, name, key: cellKey });
  }

  for (let i = 0; i < cellInserts.length; i += BATCH_SIZE) {
    const batch = cellInserts.slice(i, i + BATCH_SIZE);
    await prisma.cell.createMany({
      data: batch.map(({ sectorId, name }) => ({ sectorId, name })),
      skipDuplicates: true,
    });
  }

  const cellIdByKey = new Map<string, string>();
  const allCells = await prisma.cell.findMany({
    select: { id: true, name: true, sectorId: true },
  });
  const sectorKeyById = new Map<string, string>();
  for (const [key, id] of sectorIdByKey) sectorKeyById.set(id, key);

  for (const c of allCells) {
    const sectorKey = sectorKeyById.get(c.sectorId);
    if (sectorKey) cellIdByKey.set(`${sectorKey}::${c.name}`, c.id);
  }

  console.log(`[Import] Cells: ${cellIdByKey.size}`);

  const villageInserts: { cellId: string; name: string }[] = [];
  for (const row of rows) {
    const districtCode = districtCodeForName(row.district_name);
    if (!districtCode) continue;
    const sectorKey = `${districtCode}::${row.sector_name}`;
    const cellKey = `${sectorKey}::${row.cell_name}`;
    const cellId = cellIdByKey.get(cellKey);
    if (!cellId) continue;
    villageInserts.push({ cellId, name: row.village_name });
  }

  let villagesCreated = 0;
  for (let i = 0; i < villageInserts.length; i += BATCH_SIZE) {
    const batch = villageInserts.slice(i, i + BATCH_SIZE);
    const result = await prisma.village.createMany({ data: batch, skipDuplicates: true });
    villagesCreated += result.count;
  }

  const [provinceCount, districtCount, sectorCount, cellCount, villageCount] = await Promise.all([
    prisma.province.count(),
    prisma.district.count(),
    prisma.sector.count(),
    prisma.cell.count(),
    prisma.village.count(),
  ]);

  await prisma.province.deleteMany({ where: { districts: { none: {} } } });
  const finalProvinceCount = await prisma.province.count();

  console.log('[Import] Complete:');
  console.log(`  Provinces: ${finalProvinceCount}`);
  console.log(`  Districts: ${districtCount}`);
  console.log(`  Sectors:   ${sectorCount}`);
  console.log(`  Cells:     ${cellCount}`);
  console.log(`  Villages:  ${villageCount} (${villagesCreated.toLocaleString()} inserted this run)`);
}

if (require.main === module) {
  const { PrismaClient } = require('../../src/generated/prisma') as typeof import('../../src/generated/prisma');
  const prisma = new PrismaClient();
  importRwandaLocations(prisma, { resetHierarchy: true })
    .then(() => prisma.$disconnect())
    .catch(async (e: unknown) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

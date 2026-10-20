import type { PrismaClient } from '../../src/generated/prisma';
import fs from 'fs';
import path from 'path';
import { importRwandaLocations } from '../scripts/import-rwanda-locations';
import {
  DISTRICT_CODE_BY_NAME,
  provinceCode,
  titleCaseProvince,
} from './rwanda-location-codes';

const DATA_FILE = path.join(__dirname, '../data/rwanda-locations.json');

/** Minimal bootstrap when JSON is not present yet. */
async function seedMinimalLocations(prisma: PrismaClient): Promise<void> {
  const districtsByProvince = new Map<string, { name: string; code: string }[]>();

  for (const [nameKey, code] of Object.entries(DISTRICT_CODE_BY_NAME)) {
    const name = nameKey.charAt(0).toUpperCase() + nameKey.slice(1);
    let province = 'Southern';
    if (['bugesera', 'gatsibo', 'kayonza', 'kirehe', 'ngoma', 'nyagatare', 'rwamagana'].includes(nameKey)) {
      province = 'Eastern';
    } else if (['burera', 'gakenke', 'gicumbi', 'musanze', 'rulindo'].includes(nameKey)) {
      province = 'Northern';
    } else if (['gasabo', 'kicukiro', 'nyarugenge'].includes(nameKey)) {
      province = 'Kigali';
    } else if (
      ['karongi', 'ngororero', 'nyabihu', 'nyamasheke', 'rubavu', 'rusizi', 'rutsiro'].includes(nameKey)
    ) {
      province = 'Western';
    }

    if (!districtsByProvince.has(province)) districtsByProvince.set(province, []);
    districtsByProvince.get(province)!.push({ name, code });
  }

  for (const [provinceName, districts] of districtsByProvince) {
    const province = await prisma.province.upsert({
      where: { name: provinceName },
      update: { code: provinceCode(provinceName) },
      create: { name: provinceName, code: provinceCode(provinceName) },
    });

    for (const d of districts) {
      const district = await prisma.district.upsert({
        where: { code: d.code },
        update: { name: d.name, provinceId: province.id },
        create: { name: d.name, code: d.code, provinceId: province.id },
      });
      await prisma.districtOrgCounter.upsert({
        where: { districtId: district.id },
        update: {},
        create: { districtId: district.id, lastSerial: 0 },
      });
    }
  }

  console.log('[Seed] Rwanda locations (minimal): 5 provinces, 30 districts — run npm run prisma:import-locations for full data');
}

export async function seedRwandaLocations(prisma: PrismaClient): Promise<void> {
  if (fs.existsSync(DATA_FILE)) {
    await importRwandaLocations(prisma, { resetHierarchy: true });
    return;
  }

  await seedMinimalLocations(prisma);
}

export { titleCaseProvince, PROVINCE_NAME_MAP, provinceCode };

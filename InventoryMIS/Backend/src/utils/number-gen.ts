import { prisma } from '../config/database';

export async function generateNumber(organizationId: string, prefix: string): Promise<string> {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const key = `seq:${organizationId}:${prefix}:${datePart}`;

  const [setting] = await prisma.$transaction([
    prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value: '0' },
      update: {},
    }),
  ]);

  const currentVal = parseInt(setting.value, 10) + 1;

  await prisma.setting.update({
    where: { organizationId_key: { organizationId, key } },
    data: { value: String(currentVal) },
  });

  const seq = String(currentVal).padStart(4, '0');
  return `${prefix}-${datePart}-${seq}`;
}

import { prisma } from '../config/database';

export async function generateSequenceNumber(
  organizationId: string,
  prefix: string
): Promise<string> {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const settingKey = `seq:${organizationId}:${prefix}:${datePart}`;

  const existing = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId, key: settingKey } },
  });

  let seq: number;
  if (existing) {
    seq = Number(existing.value) + 1;
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: String(seq) },
    });
  } else {
    seq = 1;
    await prisma.setting.create({
      data: { organizationId, key: settingKey, value: '1' },
    });
  }

  return `${prefix}-${datePart}-${String(seq).padStart(4, '0')}`;
}

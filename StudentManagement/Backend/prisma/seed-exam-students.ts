import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;
const STREAMS = ['A', 'B', 'C', 'D'] as const;
const PER_CLASS = 20;
const SAMPLE_TAG = 'EXAM_SAMPLE';

const FIRST_M = [
  'Jean', 'Eric', 'Patrick', 'Alain', 'Fabrice', 'Samuel', 'Olivier', 'Innocent', 'Thierry', 'Yves',
  'Christian', 'Elie', 'Pacifique', 'Honore', 'Aimable', 'Claude', 'Kevin', 'Dieudonne', 'Placide', 'Emile',
];
const FIRST_F = [
  'Aline', 'Chantal', 'Grace', 'Diane', 'Sandrine', 'Clarisse', 'Yvette', 'Belise', 'Ange', 'Solange',
  'Josiane', 'Nadine', 'Keza', 'Ineza', 'Alice', 'Jeanne', 'Marie', 'Immaculee', 'Aurore', 'Esperance',
];
const LAST = [
  'Uwimana', 'Niyonzima', 'Habimana', 'Mukamana', 'Nkurunziza', 'Iradukunda', 'Uwase', 'Mugisha',
  'Niyitegeka', 'Bizimana', 'Hakizimana', 'Nsengimana', 'Mukeshimana', 'Niyomugabo', 'Twagirimana',
  'Uwizeyimana', 'Niyonsenga', 'Mukarwego', 'Niyibizi', 'Habineza',
];

function studentUid(seq: number) {
  return `04001${String(seq).padStart(4, '0')}26`;
}

function birthYear(level: string) {
  const n = Number(level.slice(1));
  return 2019 - (n - 1);
}

function settingsYear(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const current = (raw as { currentAcademicYear?: string }).currentAcademicYear;
    if (current && /^\d{4}-\d{4}$/.test(current)) return current;
  }
  return '2025-2026';
}

async function resolveTenant() {
  const fromEnv = process.env.SEED_ORG_ID?.trim();
  if (fromEnv) {
    const t = await prisma.tenant.findFirst({
      where: { OR: [{ organizationId: fromEnv }, { organizationCode: fromEnv }] },
    });
    if (t) return t;
  }
  const tenants = await prisma.tenant.findMany({ where: { status: 'ACTIVE' } });
  const saintTheo = tenants.find(
    (t) =>
      t.organizationId === 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' ||
      t.organizationCode === 'STTHEO' ||
      /saint\s*theo/i.test(t.organizationName)
  );
  if (saintTheo) return saintTheo;
  const live = tenants.find((t) => /st\s*theo/i.test(t.organizationName) && t.organizationCode !== 'STTHEO')
    ?? tenants.find((t) => t.organizationCode === '04001');
  if (live) return live;
  const ranked = await Promise.all(tenants.map(async (t) => ({
    t,
    n: await prisma.student.count({ where: { organizationId: t.organizationId } }),
  })));
  ranked.sort((a, b) => b.n - a.n);
  if (!ranked[0]) throw new Error('No Student Management tenant found');
  return ranked[0].t;
}

async function main() {
  const tenant = await resolveTenant();
  const orgId = tenant.organizationId;
  const currentYear = settingsYear(tenant.academicSettings);
  const extraYear = currentYear === '2026-2027' ? '2025-2026' : '2026-2027';
  console.log(`Seeding into ${tenant.organizationName} (${orgId})`);
  console.log(`Academic year ${currentYear} (current) + ${extraYear}`);

  const gradeMap = new Map<string, string>();
  for (const [i, name] of LEVELS.entries()) {
    const grade = await prisma.grade.upsert({
      where: { organizationId_name: { organizationId: orgId, name } },
      update: { category: 'PRIMARY', sortOrder: 4 + i },
      create: { organizationId: orgId, name, category: 'PRIMARY', sortOrder: 4 + i },
    });
    gradeMap.set(name, grade.id);
  }

  const classMap = new Map<string, string>();
  for (const [i, name] of LEVELS.entries()) {
    for (const stream of STREAMS) {
      const gradeId = gradeMap.get(name)!;
      const existing = await prisma.class.findFirst({
        where: { organizationId: orgId, name, stream, combinationId: null },
      });
      const cls = existing
        ? await prisma.class.update({
            where: { id: existing.id },
            data: { category: 'PRIMARY', sortOrder: 4 + i, gradeId },
          })
        : await prisma.class.create({
            data: {
              organizationId: orgId,
              name,
              stream,
              category: 'PRIMARY',
              sortOrder: 4 + i,
              combinationId: null,
              gradeId,
            },
          });
      classMap.set(`${name} ${stream}`, cls.id);
    }
  }
  console.log(`Classes ready: ${classMap.size} (P1–P6 × A–D)`);

  let createdStudents = 0;
  let reusedStudents = 0;
  let seq = 8001;

  for (const [levelIndex, level] of LEVELS.entries()) {
    for (const [streamIndex, stream] of STREAMS.entries()) {
      const classId = classMap.get(`${level} ${stream}`)!;
      const classLabel = `${level} ${stream}`;
      for (let i = 0; i < PER_CLASS; i++) {
        const female = i % 2 === 1;
        const firstName = (female ? FIRST_F : FIRST_M)[i % 20]!;
        const lastName = LAST[(i + streamIndex + levelIndex) % LAST.length]!;
        const uid = studentUid(seq);
        seq += 1;

        const existing = await prisma.student.findFirst({
          where: { organizationId: orgId, studentUid: uid },
        });

        const student = existing
          ? existing
          : await prisma.student.create({
              data: {
                organizationId: orgId,
                studentUid: uid,
                studentCode: uid,
                firstName,
                lastName,
                gender: female ? 'FEMALE' : 'MALE',
                dateOfBirth: new Date(`${birthYear(level)}-03-${String((i % 27) + 1).padStart(2, '0')}T12:00:00.000Z`),
                nationality: 'Rwandan',
                district: 'Gasabo',
                sector: 'Kimironko',
                status: 'ACTIVE',
                identityRemarks: `${SAMPLE_TAG} ${classLabel}`,
              },
            });

        if (existing) reusedStudents += 1;
        else createdStudents += 1;

        await prisma.enrollment.updateMany({
          where: { organizationId: orgId, studentId: student.id, isCurrent: true },
          data: { isCurrent: false },
        });

        await prisma.enrollment.upsert({
          where: {
            organizationId_studentId_academicYear: {
              organizationId: orgId,
              studentId: student.id,
              academicYear: currentYear,
            },
          },
          update: { classId, status: 'ACTIVE', isCurrent: true, term: 'Term 1' },
          create: {
            organizationId: orgId,
            studentId: student.id,
            classId,
            academicYear: currentYear,
            status: 'ACTIVE',
            isCurrent: true,
            term: 'Term 1',
            joiningDate: new Date('2025-09-01T12:00:00.000Z'),
          },
        });

        await prisma.enrollment.upsert({
          where: {
            organizationId_studentId_academicYear: {
              organizationId: orgId,
              studentId: student.id,
              academicYear: extraYear,
            },
          },
          update: { classId, status: 'ACTIVE', isCurrent: false, term: 'Term 1' },
          create: {
            organizationId: orgId,
            studentId: student.id,
            classId,
            academicYear: extraYear,
            status: 'ACTIVE',
            isCurrent: false,
            term: 'Term 1',
            joiningDate: new Date('2025-09-01T12:00:00.000Z'),
          },
        });
      }
      console.log(`  ${classLabel}: ${PER_CLASS} students`);
    }
  }

  console.log(`Done. Created ${createdStudents} students, reused ${reusedStudents} in ${tenant.organizationName}.`);
  console.log('Refresh Manage Students (year 2025–2026) to see P1–P6 A–D.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

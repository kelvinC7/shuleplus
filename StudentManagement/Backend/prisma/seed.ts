import { PrismaClient } from '../src/generated/prisma';

const SAINT_THEO_ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Student Management module...');

  const tenant = await prisma.tenant.upsert({
    where: { organizationId: SAINT_THEO_ORG_ID },
    update: { district: 'Gasabo', schoolCode: '001' },
    create: {
      organizationId: SAINT_THEO_ORG_ID,
      organizationCode: 'STTHEO',
      organizationName: 'Saint Theo School',
      district: 'Gasabo',
      schoolCode: '001',
      status: 'ACTIVE',
    },
  });
  console.log(`Tenant: ${tenant.organizationName} (${tenant.organizationId})`);

  // ── Grades ──────────────────────────────────────────────────
  const gradeDefs: { name: string; category: string; sortOrder: number }[] = [
    { name: 'N1', category: 'Nursery', sortOrder: 1 },
    { name: 'N2', category: 'Nursery', sortOrder: 2 },
    { name: 'N3', category: 'Nursery', sortOrder: 3 },
    { name: 'P1', category: 'Primary', sortOrder: 4 },
    { name: 'P2', category: 'Primary', sortOrder: 5 },
    { name: 'P3', category: 'Primary', sortOrder: 6 },
    { name: 'P4', category: 'Primary', sortOrder: 7 },
    { name: 'P5', category: 'Primary', sortOrder: 8 },
    { name: 'P6', category: 'Primary', sortOrder: 9 },
    { name: 'S1', category: 'O-Level', sortOrder: 10 },
    { name: 'S2', category: 'O-Level', sortOrder: 11 },
    { name: 'S3', category: 'O-Level', sortOrder: 12 },
    { name: 'S4', category: 'A-Level', sortOrder: 13 },
    { name: 'S5', category: 'A-Level', sortOrder: 14 },
    { name: 'S6', category: 'A-Level', sortOrder: 15 },
  ];

  const gradeMap = new Map<string, string>();
  for (const g of gradeDefs) {
    const grade = await prisma.grade.upsert({
      where: { organizationId_name: { organizationId: SAINT_THEO_ORG_ID, name: g.name } },
      update: { category: g.category, sortOrder: g.sortOrder },
      create: { organizationId: SAINT_THEO_ORG_ID, ...g },
    });
    gradeMap.set(g.name, grade.id);
  }
  console.log(`Upserted ${gradeDefs.length} grades`);

  // ── Subjects ──────────────────────────────────────────────
  const subjectDefs: { name: string; code: string; category: string }[] = [
    { name: 'Mathematics', code: 'MTH', category: 'Core' },
    { name: 'English', code: 'ENG', category: 'Core' },
    { name: 'Kinyarwanda', code: 'KIN', category: 'Core' },
    { name: 'Physics', code: 'PHY', category: 'Sciences' },
    { name: 'Chemistry', code: 'CHM', category: 'Sciences' },
    { name: 'Biology', code: 'BIO', category: 'Sciences' },
    { name: 'Information and Communication Technology', code: 'ICT', category: 'Technical' },
    { name: 'History', code: 'HIS', category: 'Humanities' },
    { name: 'Geography', code: 'GEO', category: 'Humanities' },
    { name: 'Civic Education', code: 'CVE', category: 'Humanities' },
    { name: 'French', code: 'FRE', category: 'Languages' },
    { name: 'Literature in English', code: 'LIT', category: 'Languages' },
    { name: 'Entrepreneurship', code: 'ENT', category: 'Technical' },
    { name: 'Accounting', code: 'ACC', category: 'Technical' },
    { name: 'Computer Science', code: 'CSC', category: 'Technical' },
  ];

  const subjectMap = new Map<string, string>();
  for (const s of subjectDefs) {
    const subject = await prisma.subject.upsert({
      where: { organizationId_name: { organizationId: SAINT_THEO_ORG_ID, name: s.name } },
      update: { code: s.code, category: s.category },
      create: { organizationId: SAINT_THEO_ORG_ID, ...s },
    });
    subjectMap.set(s.name, subject.id);
  }
  console.log(`Upserted ${subjectDefs.length} subjects`);

  // ── Combinations ──────────────────────────────────────────
  const comboDefs = [
    { name: 'PCM', displayName: 'Physics, Chemistry, Mathematics', subjects: ['Physics', 'Chemistry', 'Mathematics'] },
    { name: 'ICT', displayName: 'Information and Communication Technology', subjects: ['Information and Communication Technology'] },
    { name: 'MCB', displayName: 'Mathematics, Chemistry, Biology', subjects: ['Mathematics', 'Chemistry', 'Biology'] },
    { name: 'BCM', displayName: 'Biology, Chemistry, Mathematics', subjects: ['Biology', 'Chemistry', 'Mathematics'] },
  ];

  const comboMap = new Map<string, string>();
  for (const c of comboDefs) {
    const combo = await prisma.combination.upsert({
      where: { organizationId_name: { organizationId: SAINT_THEO_ORG_ID, name: c.name } },
      update: {},
      create: { organizationId: SAINT_THEO_ORG_ID, name: c.name, displayName: c.displayName },
    });
    comboMap.set(c.name, combo.id);

    // Link subjects to combination via join table
    for (const subjectName of c.subjects) {
      const subjectId = subjectMap.get(subjectName);
      if (subjectId) {
        await prisma.combinationSubject.upsert({
          where: { combinationId_subjectId: { combinationId: combo.id, subjectId } },
          update: {},
          create: { combinationId: combo.id, subjectId },
        });
      }
    }
  }
  console.log(`Upserted ${comboDefs.length} combinations with subject links`);

  // ── Classes ───────────────────────────────────────────────
  const nurseryPrimary: { name: string; stream: string; category: string; sortOrder: number }[] = [
    ...['N1', 'N2', 'N3'].flatMap((name, i) =>
      ['A', 'B'].map((stream) => ({ name, stream, category: 'Nursery', sortOrder: i + 1 }))
    ),
    ...['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].flatMap((name, i) =>
      ['A', 'B', 'C', 'D'].map((stream) => ({ name, stream, category: 'Primary', sortOrder: 4 + i }))
    ),
    ...['S1', 'S2', 'S3'].flatMap((name, i) =>
      ['A', 'B'].map((stream) => ({ name, stream, category: 'O-Level', sortOrder: 10 + i }))
    ),
  ];

  const aLevelDefs: { name: string; stream: string; category: string; sortOrder: number; comboName: string }[] = [];
  for (const name of ['S4', 'S5', 'S6']) {
    const sortOrder = name === 'S4' ? 13 : name === 'S5' ? 14 : 15;
    for (const comboName of ['PCM', 'ICT']) {
      aLevelDefs.push({ name, stream: 'A', category: 'A-Level', sortOrder, comboName });
    }
    for (const comboName of ['MCB', 'BCM']) {
      aLevelDefs.push({ name, stream: 'B', category: 'A-Level', sortOrder, comboName });
    }
  }

  let created = 0;
  for (const cls of nurseryPrimary) {
    const gradeId = gradeMap.get(cls.name) ?? null;
    const key = { organizationId: SAINT_THEO_ORG_ID, name: cls.name, combinationId: null, stream: cls.stream };
    const existing = await prisma.class.findFirst({ where: key as any });
    if (!existing) {
      await prisma.class.create({
        data: { organizationId: SAINT_THEO_ORG_ID, ...cls, combinationId: null, gradeId },
      });
      created++;
    } else {
      if (!existing.gradeId && gradeId) {
        await prisma.class.update({ where: { id: existing.id }, data: { gradeId } });
      }
    }
  }

  for (const cls of aLevelDefs) {
    const gradeId = gradeMap.get(cls.name) ?? null;
    const comboId = comboMap.get(cls.comboName)!;
    const key = { organizationId: SAINT_THEO_ORG_ID, name: cls.name, combinationId: comboId, stream: cls.stream };
    const existing = await prisma.class.findFirst({ where: key });
    if (!existing) {
      await prisma.class.create({
        data: {
          organizationId: SAINT_THEO_ORG_ID,
          name: cls.name,
          stream: cls.stream,
          category: cls.category,
          sortOrder: cls.sortOrder,
          combinationId: comboId,
          gradeId,
        },
      });
      created++;
    } else {
      if (!existing.gradeId && gradeId) {
        await prisma.class.update({ where: { id: existing.id }, data: { gradeId } });
      }
    }
  }

  const totalConfig = nurseryPrimary.length + aLevelDefs.length;
  console.log(`Created ${created} classes (total: ${totalConfig} configured)`);

  // ── Exams ─────────────────────────────────────────────────
  const examDefs = [
    { name: 'Term 1 Mid-Term Exam', type: 'MIDTERM' as const, academicYear: '2026', term: 'Term 1', status: 'COMPLETED' as const, totalMarks: 100, passingMarks: 50, description: 'Mid-term examination for Term 1' },
    { name: 'Term 1 Final Exam', type: 'FINAL' as const, academicYear: '2026', term: 'Term 1', status: 'COMPLETED' as const, totalMarks: 100, passingMarks: 50, description: 'End of term 1 examination' },
    { name: 'Term 2 Mid-Term Exam', type: 'MIDTERM' as const, academicYear: '2026', term: 'Term 2', status: 'IN_PROGRESS' as const, totalMarks: 100, passingMarks: 50, description: 'Mid-term examination for Term 2' },
    { name: 'Term 2 CAT 1', type: 'CAT' as const, academicYear: '2026', term: 'Term 2', status: 'UPCOMING' as const, totalMarks: 30, passingMarks: 15, description: 'Continuous Assessment Test 1' },
    { name: 'Term 2 Final Exam', type: 'FINAL' as const, academicYear: '2026', term: 'Term 2', status: 'DRAFT' as const, totalMarks: 100, passingMarks: 50, description: 'End of term 2 examination' },
    { name: 'Term 3 CAT 1', type: 'CAT' as const, academicYear: '2026', term: 'Term 3', status: 'DRAFT' as const, totalMarks: 30, passingMarks: 15 },
    { name: 'Term 3 Final Exam', type: 'FINAL' as const, academicYear: '2026', term: 'Term 3', status: 'DRAFT' as const, totalMarks: 100, passingMarks: 50 },
  ];

  let examsCreated = 0;
  for (const e of examDefs) {
    const existing = await prisma.exam.findFirst({
      where: { organizationId: SAINT_THEO_ORG_ID, name: e.name, academicYear: e.academicYear },
    });
    if (!existing) {
      await prisma.exam.create({
        data: { organizationId: SAINT_THEO_ORG_ID, ...e },
      });
      examsCreated++;
    }
  }
  console.log(`Created ${examsCreated} exams`);

  console.log('Academic seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

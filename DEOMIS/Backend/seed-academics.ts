import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();
const ORG = 'org-demo-school';

const SUBJECTS = ['Mathematics', 'English', 'Kinyarwanda', 'Physics', 'Biology', 'Chemistry', 'History', 'Geography'];

async function main() {
  const s3 = await prisma.class.findFirstOrThrow({ where: { organizationId: ORG, name: 'S3' } });
  const s1 = await prisma.class.findFirstOrThrow({ where: { organizationId: ORG, name: 'S1' } });

  const existing = await prisma.student.findMany({ where: { organizationId: ORG } });
  const kevin = existing.find((s) => s.studentCode === 'KGS-2026-001')!;
  const emely = existing.find((s) => s.studentCode === 'KGS-2026-002')!;

  const mkStudent = async (code: string, first: string, last: string, clsId: string) => {
    const found = existing.find((s) => s.studentCode === code);
    if (found) return found;
    const st = await prisma.student.create({
      data: {
        organizationId: ORG,
        studentUid: `uid-${code}`,
        firstName: first,
        lastName: last,
        studentCode: code,
        gender: first === 'Aline' ? 'FEMALE' : 'MALE',
      },
    });
    await prisma.enrollment.create({
      data: {
        organizationId: ORG,
        studentId: st.id,
        classId: clsId,
        academicYear: '2026',
        status: 'ACTIVE',
        isCurrent: true,
        term: 'Term II',
      },
    });
    return st;
  };

  const aline = await mkStudent('KGS-2026-003', 'Aline', 'Mukamana', s3.id);
  const eric = await mkStudent('KGS-2026-004', 'Eric', 'Habimana', s3.id);
  const diane = await mkStudent('KGS-2026-005', 'Diane', 'Ingabire', s1.id);

  const subjects = [];
  for (const name of SUBJECTS) {
    let sub = await prisma.subject.findFirst({ where: { organizationId: ORG, name } });
    if (!sub) sub = await prisma.subject.create({ data: { organizationId: ORG, name, code: name.slice(0, 3).toUpperCase() } });
    subjects.push(sub);
  }

  const today = new Date();
  const mkExam = async (name: string, type: string, term: string, status: string, startOffsetDays: number) => {
    const start = new Date(today);
    start.setDate(start.getDate() + startOffsetDays);
    const end = new Date(start);
    end.setDate(end.getDate() + 5);
    let exam = await prisma.exam.findFirst({ where: { organizationId: ORG, name } });
    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          organizationId: ORG,
          name,
          type: type as any,
          academicYear: '2026',
          term,
          startDate: start,
          endDate: end,
          status: status as any,
          totalMarks: 100,
          passingMarks: 40,
        },
      });
    }
    return exam;
  };

  const term1Final = await mkExam('Term I Final Exam', 'FINAL', 'Term I', 'COMPLETED', -40);
  const term2Mid = await mkExam('Term II Mid-Term Exam', 'MIDTERM', 'Term II', 'IN_PROGRESS', 3);

  const classStudents: Record<string, string[]> = {
    [s3.id]: [kevin.id, aline.id, eric.id],
    [s1.id]: [emely.id, diane.id],
  };

  const scores: Record<string, (s: string, sub: string) => number> = {
    [kevin.id]: (s, sub) => ({ Mathematics: 92, English: 78, Kinyarwanda: 84, Physics: 88, Biology: 76, Chemistry: 81, History: 90, Geography: 74 })[sub] ?? 70,
    [aline.id]: (s, sub) => ({ Mathematics: 85, English: 88, Kinyarwanda: 90, Physics: 72, Biology: 82, Chemistry: 79, History: 86, Geography: 91 })[sub] ?? 70,
    [eric.id]: (s, sub) => ({ Mathematics: 76, English: 70, Kinyarwanda: 74, Physics: 80, Biology: 85, Chemistry: 88, History: 68, Geography: 72 })[sub] ?? 70,
    [emely.id]: (s, sub) => ({ Mathematics: 88, English: 92, Kinyarwanda: 80, Physics: 78, Biology: 90, Chemistry: 86, History: 84, Geography: 87 })[sub] ?? 70,
    [diane.id]: (s, sub) => ({ Mathematics: 72, English: 84, Kinyarwanda: 86, Physics: 70, Biology: 78, Chemistry: 74, History: 80, Geography: 76 })[sub] ?? 70,
  };

  for (const exam of [term1Final, term2Mid]) {
    for (const [clsId, studentIds] of Object.entries(classStudents)) {
      for (const studentId of studentIds) {
        for (const sub of subjects) {
          const existingMark = await prisma.markEntry.findFirst({
            where: { organizationId: ORG, examId: exam.id, studentId, subjectId: sub.id },
          });
          if (existingMark) continue;
          const score = scores[studentId](studentId, sub.name);
          await prisma.markEntry.create({
            data: {
              organizationId: ORG,
              examId: exam.id,
              studentId,
              subjectId: sub.id,
              classId: clsId,
              score,
              remarks: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Fair',
            },
          });
        }
      }
    }
  }

  console.log(JSON.stringify({ subjects: subjects.length, exams: [term1Final.name, term2Mid.name], students: 5 }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

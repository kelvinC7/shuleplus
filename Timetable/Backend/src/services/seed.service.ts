import { AssignmentStatus } from '../generated/prisma';
import { prisma } from '../config/database';

const DEFAULT_TERM = 'Term 1';
const DEFAULT_YEAR = String(new Date().getFullYear());

const DEMO_CLASSES = ['P5A', 'P5B', 'P6A'];
const DEMO_SUBJECTS = [
  { name: 'Mathematics', teacher: 'Alice Mukamana', periods: 5 },
  { name: 'English', teacher: 'Jean Baptiste', periods: 5 },
  { name: 'Science', teacher: 'Grace Uwase', periods: 4 },
  { name: 'Social Studies', teacher: 'Patrick Niyonzima', periods: 3 },
  { name: 'Kinyarwanda', teacher: 'Alice Mukamana', periods: 3 },
  { name: 'ICT', teacher: 'Grace Uwase', periods: 2 },
];

const TEACHER_IDS: Record<string, string> = {
  'Alice Mukamana': 'teacher-alice',
  'Jean Baptiste': 'teacher-jean',
  'Grace Uwase': 'teacher-grace',
  'Patrick Niyonzima': 'teacher-patrick',
};

export class SeedService {
  async seedTenantData(organizationId: string) {
    const existing = await prisma.teacherAssignment.count({ where: { organizationId } });
    if (existing > 0) return { seeded: false };

    await prisma.timetableSchoolSchedule.create({
      data: {
        organizationId,
        term: DEFAULT_TERM,
        academicYear: DEFAULT_YEAR,
        dayStart: '07:30',
        dayEnd: '16:00',
        periodDurationMinutes: 40,
        activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        breaks: [
          { start: '10:20', end: '10:40', label: 'Morning Break' },
          { start: '12:40', end: '13:30', label: 'Lunch' },
        ],
      },
    });

    for (const subject of DEMO_SUBJECTS) {
      const existing = await prisma.timetableCourseConfig.findFirst({
        where: { organizationId, subjectName: subject.name },
      });
      if (existing) continue;
      await prisma.timetableCourseConfig.create({
        data: {
          organizationId,
          subjectName: subject.name,
          priority: subject.name === 'Mathematics' ? 9 : 5,
          requiresLab: subject.name === 'Science' || subject.name === 'ICT',
          prefersDoublePeriod: subject.name === 'Science',
          timePreference: subject.name === 'Mathematics' ? 'MORNING' : 'ANY',
        },
      });
    }

    const teacherNames = [...new Set(DEMO_SUBJECTS.map((s) => s.teacher))];
    for (const name of teacherNames) {
      await prisma.timetableTeacherProfile.upsert({
        where: {
          organizationId_teacherUserId: { organizationId, teacherUserId: TEACHER_IDS[name] },
        },
        create: {
          organizationId,
          teacherUserId: TEACHER_IDS[name],
          teacherName: name,
          maxPeriodsPerDay: 6,
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        },
        update: {},
      });
    }

    for (const className of DEMO_CLASSES) {
      for (const subject of DEMO_SUBJECTS) {
        await prisma.teacherAssignment.create({
          data: {
            organizationId,
            className,
            subjectName: subject.name,
            teacherUserId: TEACHER_IDS[subject.teacher],
            teacherName: subject.teacher,
            periodsPerWeek: subject.periods,
            term: DEFAULT_TERM,
            academicYear: DEFAULT_YEAR,
            status: AssignmentStatus.ACTIVE,
            room: subject.name === 'Science' || subject.name === 'ICT' ? 'Lab 1' : 'Room 12',
          },
        });
      }
    }

    return { seeded: true, term: DEFAULT_TERM, academicYear: DEFAULT_YEAR, classes: DEMO_CLASSES };
  }

  async seedDemo(organizationId: string) {
    return this.seedTenantData(organizationId);
  }
}

export const seedService = new SeedService();

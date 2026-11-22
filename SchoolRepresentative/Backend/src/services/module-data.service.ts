import { env } from '../config/env';
import { moduleRequest, moduleRequestSafe } from '../clients/module.client';

export interface ModuleStudent {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  classId?: string | null;
  className?: string | null;
  stream?: string | null;
  academicYear?: string | null;
  educationLevel?: string | null;
  rollNumber?: string | null;
  status?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  photoUrl?: string | null;
}

export interface ModuleClass {
  id: string;
  name: string;
  stream?: string | null;
  category?: string | null;
  label: string;
}

export interface ModuleStudentProfile {
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    firstName: string;
    lastName: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    nationality?: string | null;
    bloodGroup?: string | null;
    allergies?: string[];
    className?: string | null;
    stream?: string | null;
    academicYear?: string | null;
    photoUrl?: string | null;
    isBoarding?: boolean;
  };
  parents: {
    father: { name: string; phone?: string; email?: string } | null;
    mother: { name: string; phone?: string; email?: string } | null;
    guardians: Array<{ name: string; phone?: string; email?: string }>;
  };
}

export interface AcademicMarkRow {
  id: string;
  organizationId: string;
  schoolName?: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  course: string;
  exam: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  academicYear: string;
  term: string;
  date: string;
}

export interface AcademicMarksResponse {
  filters: {
    classes: Array<{ id: string; label: string }>;
    courses: Array<{ id: string; name: string }>;
    academicYears: string[];
    terms: string[];
  };
  summary: { average: number; passRate: number; entries: number; students: number; exams: number };
  byClass: Array<{
    classId: string;
    className: string;
    average: number;
    passRate: number;
    entries: number;
    students: number;
  }>;
  byCourse: Array<{
    subjectId: string;
    course: string;
    average: number;
    passRate: number;
    entries: number;
    students: number;
  }>;
  rows: AcademicMarkRow[];
}

export interface TimetableRow {
  id: string;
  organizationId?: string;
  className: string;
  subjectName: string;
  teacherName: string;
  teacherUserId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  term?: string;
  academicYear?: string;
}

export interface AttendanceTapRow {
  id: string;
  studentCode: string | null;
  studentName: string;
  className: string | null;
  level: string | null;
  direction: string;
  status: string;
  lessonDate: string;
  entryTime: string | null;
  exitTime: string | null;
}

export interface LessonSessionRow {
  id: string;
  className: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  room: string | null;
  periodLabel: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  punctuality: string;
  startedAt: string | null;
  completedAt: string | null;
  attendanceDone: boolean;
  attendanceSubmittedAt: string | null;
}

export interface StaffRosterRow {
  id: string;
  fullName: string;
  employeeNumber?: string | null;
  position?: string | null;
  email?: string | null;
}

type StudentQuery = {
  search?: string;
  className?: string;
  classId?: string;
  academicYear?: string;
  status?: string;
};

type MarksQuery = {
  classId?: string;
  className?: string;
  subjectId?: string;
  course?: string;
  academicYear?: string;
  term?: string;
};

type TimetableQuery = {
  className?: string;
  teacherUserId?: string;
  dayOfWeek?: string;
  term?: string;
  academicYear?: string;
};

function studentQuery(query: StudentQuery) {
  return {
    status: query.status ?? 'ACTIVE',
    search: query.search,
    className: query.className,
    classId: query.classId,
    academicYear: query.academicYear,
  };
}

function marksQuery(query: MarksQuery) {
  return {
    classId: query.classId,
    className: query.className,
    subjectId: query.subjectId,
    course: query.course,
    academicYear: query.academicYear,
    term: query.term,
  };
}

function timetableQuery(query: TimetableQuery) {
  return {
    className: query.className,
    teacherUserId: query.teacherUserId,
    day: query.dayOfWeek,
    term: query.term,
    academicYear: query.academicYear,
  };
}

export const moduleData = {
  studentManagement: {
    students(organizationId: string, query: StudentQuery = {}) {
      return moduleRequest<ModuleStudent[]>({
        service: 'Student Management',
        baseUrl: env.STUDENT_MANAGEMENT_API_URL,
        path: '/service/students',
        organizationId,
        query: studentQuery(query),
      });
    },

    studentsSafe(organizationId: string, query: StudentQuery = {}) {
      return moduleRequestSafe<ModuleStudent[]>({
        service: 'Student Management',
        baseUrl: env.STUDENT_MANAGEMENT_API_URL,
        path: '/service/students',
        organizationId,
        query: studentQuery(query),
      });
    },

    classes(organizationId: string) {
      return moduleRequest<ModuleClass[]>({
        service: 'Student Management',
        baseUrl: env.STUDENT_MANAGEMENT_API_URL,
        path: '/service/classes',
        organizationId,
      });
    },

    profile(organizationId: string, studentCode: string) {
      return moduleRequest<ModuleStudentProfile>({
        service: 'Student Management',
        baseUrl: env.STUDENT_MANAGEMENT_API_URL,
        path: '/service/student-profile',
        organizationId,
        query: { studentCode },
      });
    },
  },

  academic: {
    marks(organizationId: string, query: MarksQuery = {}) {
      return moduleRequest<AcademicMarksResponse>({
        service: 'Academic',
        baseUrl: env.ACADEMIC_API_URL,
        path: '/service/marks-overview',
        organizationId,
        query: marksQuery(query),
      });
    },

    marksSafe(organizationId: string, query: MarksQuery = {}) {
      return moduleRequestSafe<AcademicMarksResponse>({
        service: 'Academic',
        baseUrl: env.ACADEMIC_API_URL,
        path: '/service/marks-overview',
        organizationId,
        query: marksQuery(query),
      });
    },
  },

  attendance: {
    records(organizationId: string, query: { date?: string; from?: string; to?: string } = {}) {
      return moduleRequest<AttendanceTapRow[]>({
        service: 'Attendance',
        baseUrl: env.ATTENDANCE_API_URL,
        path: '/service/attendance',
        organizationId,
        query: { date: query.date, from: query.from, to: query.to },
      });
    },
  },

  lessons: {
    sessions(organizationId: string, date: string) {
      return moduleRequest<LessonSessionRow[]>({
        service: 'Timetable',
        baseUrl: env.TIMETABLE_API_URL,
        path: '/internal/lesson-sessions',
        organizationId,
        query: { date },
      });
    },
  },

  staff: {
    roster(organizationId: string) {
      return moduleRequest<StaffRosterRow[]>({
        service: 'Timetable',
        baseUrl: env.TIMETABLE_API_URL,
        path: '/internal/staff',
        organizationId,
      });
    },
  },

  timetable: {
    entries(organizationId: string, query: TimetableQuery = {}) {
      return moduleRequest<TimetableRow[]>({
        service: 'Timetable',
        baseUrl: env.TIMETABLE_API_URL,
        path: '/internal/timetable',
        organizationId,
        query: timetableQuery(query),
      });
    },

    entriesSafe(organizationId: string, query: TimetableQuery = {}) {
      return moduleRequestSafe<TimetableRow[]>({
        service: 'Timetable',
        baseUrl: env.TIMETABLE_API_URL,
        path: '/internal/timetable',
        organizationId,
        query: timetableQuery(query),
      });
    },
  },
};

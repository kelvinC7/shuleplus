export type RollCallStatus = 'DRAFT' | 'COMPLETED';
export type RollCallRowStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK' | 'UNMARKED' | string;

export interface RollCallClassOption {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
  grade?: { name?: string | null } | null;
  studentCount: number;
}

export interface RollCallTemplate {
  id: string;
  name: string;
  defaultTime: string | null;
  attendanceType: string;
  sortOrder: number;
}

export interface RollCallCounts {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
  marked?: number;
  rate?: number;
}

export interface RollCallRow {
  id: string;
  studentCode: string;
  fullName: string;
  rollNumber: string | null;
  photoUrl: string | null;
  gender: string | null;
  status: RollCallRowStatus;
  reason: string | null;
  arrivalTime: string | null;
  notes: string | null;
  markedAt: string | null;
}

export interface RollCallSessionSummary {
  id: string;
  date?: string;
  name: string;
  className: string;
  classLabel?: string | null;
  startTime?: string | null;
  attendanceType?: string;
  academicYear?: string | null;
  term?: string | null;
  status: RollCallStatus;
  reference?: string | null;
  completedAt?: string | null;
  sessionNotes?: string | null;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
}

export interface RollCallSessionDetail extends RollCallSessionSummary {
  sessionDate: string;
  teacherName: string;
  rows: RollCallRow[];
  counts: RollCallCounts;
}

export interface RollCallDashboard {
  date: string;
  kpis: {
    todayCalls: number;
    students: number;
    present: number;
    rate: number;
  };
  todaySessions: RollCallSessionSummary[];
  history: RollCallSessionSummary[];
}

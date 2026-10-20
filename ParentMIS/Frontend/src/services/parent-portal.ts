import { api } from '@/services/api';
import type { LinkedStudent } from '@/shared/auth-token';

export type ParentOverview = {
 student: {
 id: string;
 studentCode: string | null;
 className: string | null;
 academicYear: string | null;
 term: string | null;
 };
 stats: {
 attendanceRate: number | null;
 attendanceLabel: string;
 attendanceSub: string;
 todayStatus: string | null;
 feesBalance: number;
 feesBalanceLabel: string;
 feesDueDate: string | null;
 unreadMessages: number;
 academicProgress: string;
 };
 todayLessons: Array<{
 subject?: string;
 teacher?: string;
 startTime?: string;
 endTime?: string;
 room?: string | null;
 }>;
 upcoming: Array<{
 id: string;
 title: string;
 date?: string | null;
 kind: 'fees' | 'timetable' | string;
 meta?: string;
 }>;
 announcement: { title: string; body: string };
 sources: { timetable: number; attendance: number; bills: number };
};

function childParams(student: LinkedStudent) {
 return {
 studentId: student.id,
 studentCode: student.studentCode ?? undefined,
 className: student.className ?? undefined,
 academicYear: student.academicYear ?? undefined,
 term: student.term ?? undefined,
 organizationId: student.organizationId ?? undefined,
 };
}

export async function fetchParentOverview(student: LinkedStudent) {
 const { data } = await api.get('/parent/overview', { params: childParams(student) });
 return data.data as ParentOverview;
}

export async function fetchParentTimetable(student: LinkedStudent) {
 const { data } = await api.get('/parent/timetable', { params: childParams(student) });
 return data.data as {
 className?: string | null;
 academicYear?: string | null;
 term?: string | null;
 rows: Array<Record<string, any>>;
 };
}

export async function fetchParentAttendance(student: LinkedStudent, range?: { from?: string; to?: string }) {
 const { data } = await api.get('/parent/attendance', {
 params: {...childParams(student),...range },
 });
 return data.data as {
 from: string;
 to: string;
 rate: number | null;
 rows: Array<Record<string, any>>;
 };
}

export async function fetchParentFees(student: LinkedStudent) {
 const { data } = await api.get('/parent/fees', { params: childParams(student) });
 return data.data as {
 totalBilled: number;
 totalPaid: number;
 balance: number;
 totalBilledLabel: string;
 totalPaidLabel: string;
 balanceLabel: string;
 bills: Array<Record<string, any>>;
 };
}

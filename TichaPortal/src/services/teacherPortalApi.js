import axios from 'axios';
import { attachIamAuth } from './iamAuth';

/**
 * TichaPortal BFF - Timetable, Student Management, Academic, Attendance.
 * Dev: empty VITE_TP_API_URL → `/tp-api` (Vite proxy to TichaPortal backend :4000).
 */
function resolveTpApiUrl() {
  const v = import.meta.env.VITE_TP_API_URL;
  if (v != null && String(v).trim() !== '') {
    const raw = String(v).trim().replace(/\/$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }
  if (import.meta.env.DEV) return '/tp-api';
  return 'https://ticha-api.shuleplus.rw/api';
}

export const TP_API_BASE_URL = resolveTpApiUrl();

const tpApi = axios.create({
  baseURL: TP_API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

attachIamAuth(tpApi);

export function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
  return payload;
}

export function tpApiError(err, fallback) {
  if (!err?.response && (err?.code === 'ERR_NETWORK' || /network|ECONNREFUSED/i.test(err?.message || ''))) {
    return 'TichaPortal backend is not reachable. Start it on port 4000.';
  }
  return err?.response?.data?.message || err?.message || fallback;
}

export function tpApiDetails(err) {
  return err?.response?.data?.details;
}

export async function fetchAcademicSettings() {
  const { data } = await tpApi.get('/timetable/academic-settings');
  return unwrap(data);
}

export async function fetchPortalBootstrap() {
  const { data } = await tpApi.get('/me');
  return unwrap(data);
}

export async function fetchTeacherProfile() {
  const { data } = await tpApi.get('/profile');
  return unwrap(data);
}

export async function fetchSchoolProfile() {
  const { data } = await tpApi.get('/school-profile');
  return unwrap(data);
}

export async function fetchCourseDefaultMarks(params) {
  const { data } = await tpApi.get('/course-default-marks', { params });
  return unwrap(data);
}

export async function uploadTeacherPhoto(dataUrl) {
  const { data } = await tpApi.post('/profile/photo', { image: dataUrl });
  return unwrap(data);
}

export async function changeTeacherPassword(currentPassword, newPassword) {
  const { data } = await tpApi.post('/profile/password', { currentPassword, newPassword });
  return unwrap(data);
}

export async function fetchTeacherToday(params) {
  const { data } = await tpApi.get('/timetable/teacher/today', { params });
  return unwrap(data);
}

export async function fetchTeacherLive(params) {
  const { data } = await tpApi.get('/timetable/teacher/live', { params });
  return unwrap(data);
}

export async function fetchTeacherSchedule(view = 'weekly', params) {
  const { data } = await tpApi.get('/timetable/teacher/schedule', {
    params: { view, ...(params || {}) },
  });
  return unwrap(data);
}

export async function fetchAttendanceHistory(params) {
  const { data } = await tpApi.get('/timetable/teacher/attendance-history', { params });
  return unwrap(data);
}

export async function fetchLessonAttendance(sessionId) {
  const { data } = await tpApi.get(`/timetable/lessons/${sessionId}/attendance`);
  return unwrap(data);
}

export async function saveLessonAttendance(sessionId, rows, submit = true) {
  const { data } = await tpApi.post(`/timetable/lessons/${sessionId}/attendance`, { rows, submit });
  return unwrap(data);
}

export async function scanClassroomQr(qrCode) {
  const { data } = await tpApi.post('/timetable/lessons/scan-qr', { qrCode });
  return unwrap(data);
}

export function tpAcademicParams(term, academicYear) {
  const params = {};
  if (term) params.term = term;
  if (academicYear) params.academicYear = academicYear;
  return params;
}

export function flattenScheduleByDay(schedule) {
  const rows = [];
  for (const [day, slots] of Object.entries(schedule?.byDay || {})) {
    for (const slot of Array.isArray(slots) ? slots : []) {
      const start = slot.startTime || '';
      rows.push({
        id: slot.timetableId || slot.id,
        day: slot.dayOfWeek || day,
        day_of_week: slot.dayOfWeek || day,
        time: start,
        start_time: start,
        end_time: slot.endTime || '',
        subject: slot.subjectName,
        group: slot.className,
        class_name: slot.className,
        roster_class_name: slot.className,
        room: slot.room || '',
        teacher_name: slot.teacherName,
        periodLabel: slot.periodLabel || null,
        period_label: slot.periodLabel || null,
        academicYear: slot.academicYear,
        academic_year: slot.academicYear,
        term: slot.term,
      });
    }
  }
  return rows;
}

export function lessonsToTimetableRows(today) {
  return (today?.lessons || []).map((l) => ({
    id: l.timetableId,
    sessionId: l.sessionId,
    day: today.dayOfWeek,
    day_of_week: today.dayOfWeek,
    time: l.startTime,
    start_time: l.startTime,
    end_time: l.endTime,
    subject: l.subjectName,
    group: l.className,
    class_name: l.className,
    roster_class_name: l.className,
    room: l.room || '',
    phase: l.phase,
    lessonStatus: l.lessonStatus,
  }));
}

export async function startLesson(body) {
  const { data } = await tpApi.post('/timetable/lessons/start', body);
  return unwrap(data);
}

export async function completeLesson(sessionId, body) {
  const { data } = await tpApi.post(`/timetable/lessons/${sessionId}/complete`, body);
  return unwrap(data);
}

export async function fetchMyCourses(params) {
  const { data } = await tpApi.get('/my-courses', { params });
  return unwrap(data);
}

export async function fetchMyClasses(params) {
  const { data } = await tpApi.get('/my-classes', { params });
  return unwrap(data);
}

export async function fetchClassStudents(classId, className, academicYear) {
  const params = {};
  if (className) params.className = className;
  if (academicYear) params.academicYear = academicYear;
  const { data } = await tpApi.get(`/my-classes/${classId}/students`, { params });
  return unwrap(data);
}

export async function fetchMyExamRooms() {
  const { data } = await tpApi.get('/examinations/me');
  return unwrap(data);
}

export async function fetchExamLists() {
  const { data } = await tpApi.get('/examinations/lists');
  return unwrap(data);
}

export async function fetchExamRoom(params) {
  const { data } = await tpApi.get('/examinations/room', { params });
  return unwrap(data);
}

export async function markExamEntry(body) {
  const { data } = await tpApi.post('/examinations/entry', body);
  return unwrap(data);
}

export async function markExamExit(body) {
  const { data } = await tpApi.post('/examinations/exit', body);
  return unwrap(data);
}

export async function checkExamEligibility(body) {
  const { data } = await tpApi.post('/examinations/eligibility', body);
  return unwrap(data);
}

export async function fetchAssessments(params) {
  const { data } = await tpApi.get('/assessments', { params });
  return unwrap(data);
}

export async function fetchAssessment(id) {
  const { data } = await tpApi.get(`/assessments/${id}`);
  return unwrap(data);
}

export async function createAssessment(body) {
  const { data } = await tpApi.post('/assessments', body);
  return unwrap(data);
}

export async function updateAssessment(id, body) {
  const { data } = await tpApi.put(`/assessments/${id}`, body);
  return unwrap(data);
}

export async function deleteAssessment(id) {
  const { data } = await tpApi.delete(`/assessments/${id}`);
  return unwrap(data);
}

export async function previewAssessmentCode(params) {
  const { data } = await tpApi.get('/assessments/preview-code', { params });
  return unwrap(data);
}

export async function fetchAssessmentStatistics(id) {
  const { data } = await tpApi.get(`/assessments/${id}/statistics`);
  return data?.data ?? data;
}

export async function fetchAssessmentMarks(id) {
  const { data } = await tpApi.get(`/assessments/${id}/marks`);
  return unwrap(data);
}

export async function enterAssessmentMarks(id, marks) {
  const { data } = await tpApi.post(`/assessments/${id}/marks`, { marks });
  return unwrap(data);
}

export async function fetchAssessmentTemplates(params) {
  const { data } = await tpApi.get('/assessment-templates', { params });
  return unwrap(data);
}

export async function fetchGradingScale(academicLevel) {
  const { data } = await tpApi.get('/grading-scale', { params: { academicLevel } });
  const rows = unwrap(data);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchReportCardSettings() {
  const { data } = await tpApi.get('/report-card/settings');
  return unwrap(data);
}

export async function fetchReportCardComments(params) {
  const { data } = await tpApi.get('/report-card/comments', { params });
  return unwrap(data);
}

export async function saveReportCardComments(body) {
  const { data } = await tpApi.put('/report-card/comments', body);
  return unwrap(data);
}

export default tpApi;

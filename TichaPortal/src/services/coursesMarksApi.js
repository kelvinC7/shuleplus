import api from './api';

export async function fetchCoursesMarksDashboard(params = {}) {
  const res = await api.get('/teacher-portal/courses-marks-dashboard', { params });
  return res.data;
}

export async function submitAssessmentMarks(assessmentId) {
  const res = await api.post(`/teacher-portal/assessments/${assessmentId}/submit`);
  return res.data;
}

export async function updateAssessmentStatus(assessmentId, status) {
  const res = await api.put(`/teacher-portal/assessments/${assessmentId}/status`, { status });
  return res.data;
}

export async function fetchMyCorrectionRequests() {
  const res = await api.get('/teacher-portal/my-correction-requests');
  return res.data;
}

export async function fetchAssessmentActivity(assessmentId) {
  const res = await api.get(`/teacher-portal/assessments/${assessmentId}/activity`);
  return res.data;
}

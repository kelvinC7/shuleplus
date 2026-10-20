import api from './api';
import {
  fetchBookTree,
  fetchCurriculumCatalog,
  generateLessonPlan,
  downloadLessonPlanExport,
} from './lessonPlansApi';

export { fetchBookTree, fetchCurriculumCatalog, generateLessonPlan, downloadLessonPlanExport };

export async function fetchLessonPlanningContext(params = {}) {
  const res = await api.get('/lesson-planning/context', { params });
  return res.data?.data ?? res.data;
}

export async function fetchClassRosterSummary(params) {
  const res = await api.get('/lesson-planning/class-summary', { params });
  return res.data?.data ?? res.data;
}

export async function listLessonPlansPaginated(params = {}) {
  const res = await api.get('/curriculum/lesson-plans', { params });
  return res.data?.data ?? res.data;
}

export async function fetchCoursePerformance(params = {}) {
  const res = await api.get('/curriculum/lesson-plans/performance', { params });
  return res.data?.data ?? res.data;
}

export async function duplicateLessonPlan(id) {
  const res = await api.post(`/curriculum/lesson-plans/${id}/duplicate`, {});
  return res.data?.data ?? res.data;
}

export async function archiveLessonPlan(id) {
  const res = await api.post(`/curriculum/lesson-plans/${id}/archive`, {});
  return res.data?.data ?? res.data;
}

export async function deleteLessonPlan(id) {
  const res = await api.delete(`/curriculum/lesson-plans/${id}`);
  return res.data?.data ?? res.data;
}

export async function markLessonPlanTaught(id, taughtAt) {
  const res = await api.post(`/curriculum/lesson-plans/${id}/mark-taught`, { taughtAt });
  return res.data?.data ?? res.data;
}

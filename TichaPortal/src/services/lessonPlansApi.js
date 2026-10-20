import api from './api';

export async function fetchAiStatus() {
  const res = await api.get('/curriculum/ai/status');
  return res.data?.data ?? res.data;
}

export async function fetchCurriculumCatalog(params = {}) {
  const res = await api.get('/curriculum/catalog', { params });
  return res.data?.data ?? res.data;
}

export async function fetchBookTree(bookId) {
  const res = await api.get(`/curriculum/books/${bookId}/tree`);
  return res.data?.data ?? res.data;
}

export async function listLessonPlans() {
  const res = await api.get('/curriculum/lesson-plans');
  return res.data?.data ?? res.data;
}

export async function getLessonPlan(id) {
  const res = await api.get(`/curriculum/lesson-plans/${id}`);
  return res.data?.data ?? res.data;
}

export async function generateLessonPlan(payload) {
  const res = await api.post('/curriculum/lesson-plans/generate', payload);
  return res.data?.data ?? res.data;
}

export async function saveLessonPlan(id, planContent, changeNote) {
  const res = await api.put(`/curriculum/lesson-plans/${id}`, { planContent, changeNote });
  return res.data?.data ?? res.data;
}

export async function regenerateSection(id, target, variant) {
  try {
    const res = await api.post(`/curriculum/lesson-plans/${id}/regenerate-section`, { target, variant });
    return res.data?.data ?? res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'AI improve failed';
    throw new Error(msg);
  }
}

export async function downloadLessonPlanExport(id, format) {
  const res = await api.get(`/curriculum/lesson-plans/${id}/export/${format}`, {
    responseType: 'blob',
  });
  const blob = res.data;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lesson-plan.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

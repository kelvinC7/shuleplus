import tpApi, { tpApiError, unwrap } from './teacherPortalApi';

export { tpApiError };

export async function fetchHomeworkStats() {
  const { data } = await tpApi.get('/homework/stats');
  return unwrap(data);
}

export async function fetchHomeworkList(params = {}) {
  const { data } = await tpApi.get('/homework', { params });
  return unwrap(data);
}

export async function fetchHomework(id) {
  const { data } = await tpApi.get(`/homework/${id}`);
  return unwrap(data);
}

export async function createHomework(body) {
  const { data } = await tpApi.post('/homework', body);
  return unwrap(data);
}

export async function updateHomework(id, body) {
  const { data } = await tpApi.put(`/homework/${id}`, body);
  return unwrap(data);
}

export async function publishHomework(id) {
  const { data } = await tpApi.post(`/homework/${id}/publish`);
  return unwrap(data);
}

export async function duplicateHomework(id) {
  const { data } = await tpApi.post(`/homework/${id}/duplicate`);
  return unwrap(data);
}

export async function patchHomework(id, body) {
  const { data } = await tpApi.patch(`/homework/${id}`, body);
  return unwrap(data);
}

export async function deleteHomework(id) {
  const { data } = await tpApi.delete(`/homework/${id}`);
  return unwrap(data);
}

export async function fetchHomeworkSubmissions(id) {
  const { data } = await tpApi.get(`/homework/${id}/submissions`);
  return unwrap(data);
}

export async function reviewHomeworkSubmission(id, body) {
  const { data } = await tpApi.post(`/homework/${id}/review`, body);
  return unwrap(data);
}

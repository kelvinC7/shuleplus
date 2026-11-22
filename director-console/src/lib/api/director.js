import { API_BASES } from './config';
import { apiRequest, unwrap } from './client';

const q = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const director = {
  context: (token) => apiRequest(API_BASES.director, '/director/context', { token }).then(unwrap),
  overview: (token, params) => apiRequest(API_BASES.director, `/director/overview${q(params)}`, { token }).then(unwrap),
  approvals: (token, params) => apiRequest(API_BASES.director, `/director/approvals${q(params)}`, { token }).then(unwrap),
  decideApproval: (token, id, body) => apiRequest(API_BASES.director, `/director/approvals/${id}/decision`, { method: 'POST', token, body }).then(unwrap),
  timetable: (token, params) => apiRequest(API_BASES.director, `/director/timetable${q(params)}`, { token }).then(unwrap),
  attendance: (token, params) => apiRequest(API_BASES.director, `/director/attendance${q(params)}`, { token }).then(unwrap),
  attendanceReport: (token, params) => apiRequest(API_BASES.director, `/director/attendance/report${q(params)}`, { token }).then(unwrap),
  fees: (token, params) => apiRequest(API_BASES.director, `/director/fees${q(params)}`, { token }).then(unwrap),
  budget: (token, params) => apiRequest(API_BASES.director, `/director/budget${q(params)}`, { token }).then(unwrap),
  hr: (token, params) => apiRequest(API_BASES.director, `/director/hr${q(params)}`, { token }).then(unwrap),
  payroll: (token, params) => apiRequest(API_BASES.director, `/director/payroll${q(params)}`, { token }).then(unwrap),
  tasks: (token, params) => apiRequest(API_BASES.director, `/director/tasks${q(params)}`, { token }).then(unwrap),
  discipline: (token, params) => apiRequest(API_BASES.director, `/director/discipline${q(params)}`, { token }).then(unwrap),
  transport: (token, params) => apiRequest(API_BASES.director, `/director/transport${q(params)}`, { token }).then(unwrap),
  services: (token, params) => apiRequest(API_BASES.director, `/director/services${q(params)}`, { token }).then(unwrap),
  circulars: (token, params) => apiRequest(API_BASES.director, `/director/communication/circulars${q(params)}`, { token }).then(unwrap),
  broadcasts: (token, params) => apiRequest(API_BASES.director, `/director/communication/broadcasts${q(params)}`, { token }).then(unwrap),
  sendBroadcast: (token, body) => apiRequest(API_BASES.director, '/director/communication/broadcasts', { method: 'POST', token, body }).then(unwrap),
  parents: (token, params) => apiRequest(API_BASES.director, `/director/communication/parents${q(params)}`, { token }).then(unwrap),
  messages: (token, params) => apiRequest(API_BASES.director, `/director/communication/chats${q(params)}`, { token }).then(unwrap),
  academics: (token, params) => apiRequest(API_BASES.director, `/director/academics${q(params)}`, { token }).then(unwrap),
  students: (token, params) => apiRequest(API_BASES.director, `/director/students${q(params)}`, { token }).then(unwrap),
  staff: (token, params) => apiRequest(API_BASES.director, `/director/staff${q(params)}`, { token }).then(unwrap),
  liveCampus: (token, params) => apiRequest(API_BASES.director, `/director/live-campus${q(params)}`, { token }).then(unwrap),
  teachingNow: (token, params) => apiRequest(API_BASES.director, `/director/teaching-now${q(params)}`, { token }).then(unwrap),
  fetch: (token, path, params) => apiRequest(API_BASES.director, `/director/${path.replace(/^\/+/, '')}${q(params)}`, { token }).then(unwrap),
};

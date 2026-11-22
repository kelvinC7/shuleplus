import { API_BASES } from './config';
import { apiRequest, unwrap } from './client';

const q = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const iam = {
  login: (payload) => apiRequest(API_BASES.iam, '/auth/login', { method: 'POST', body: payload }),
  refresh: (refreshToken) => apiRequest(API_BASES.iam, '/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (token) => apiRequest(API_BASES.iam, '/auth/logout', { method: 'POST', token }),
  me: (token) => apiRequest(API_BASES.iam, '/auth/me', { token }).then(unwrap),
  modules: (token) => apiRequest(API_BASES.iam, '/iam/me/modules', { token }).then(unwrap),
  notifications: (token) => apiRequest(API_BASES.iam, '/notifications/in-app', { token }).then(unwrap),
  unreadCount: (token) => apiRequest(API_BASES.iam, '/notifications/in-app/unread-count', { token }).then(unwrap),
  markRead: (token, id) => apiRequest(API_BASES.iam, `/notifications/in-app/${id}/read`, { method: 'PATCH', token }).then(unwrap),
  markAllRead: (token) => apiRequest(API_BASES.iam, '/notifications/in-app/read-all', { method: 'PATCH', token }).then(unwrap),
  repSession: (token) => apiRequest(API_BASES.iam, '/iam/representative/session', { token }).then(unwrap),
  repSchools: (token, params) => apiRequest(API_BASES.iam, `/iam/representative/schools${q(params)}`, { token }).then(unwrap),
  repOverview: (token, params) => apiRequest(API_BASES.iam, `/iam/representative/overview${q(params)}`, { token }).then(unwrap),
  repAlerts: (token, params) => apiRequest(API_BASES.iam, `/iam/representative/alerts${q(params)}`, { token }).then(unwrap),
  repAttendance: (token, params) => apiRequest(API_BASES.iam, `/iam/representative/attendance${q(params)}`, { token }).then(unwrap),
  repFinance: (token, params) => apiRequest(API_BASES.iam, `/iam/representative/finance/school-fees${q(params)}`, { token }).then(unwrap),
};

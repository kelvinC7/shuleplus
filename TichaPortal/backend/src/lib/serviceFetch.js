const env = require('./env');

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function unavailableMessage(baseUrl) {
  const u = String(baseUrl || '');
  if (u.includes('3003')) {
    return 'Academic is not running on port 3003. Start Academic to load examinations.';
  }
  if (u.includes('3052')) {
    return 'Student Management is not running on port 3052. Start it to load classes and students.';
  }
  if (u.includes('3010')) {
    return 'Timetable API is not running on port 3010.';
  }
  if (u.includes('3024')) {
    return 'Attendance is not running on port 3024.';
  }
  if (u.includes('3001') || u.includes('4001')) {
    return 'Authentication (IAM) is not reachable.';
  }
  if (u.includes('3026') || u.includes('4006')) {
    return 'Payroll is not reachable. Check PAYROLL_API_URL on the TichaPortal backend.';
  }
  if (u.includes('3005') || u.includes('4007')) {
    return 'HR is not reachable. Check HR_API_URL on the TichaPortal backend.';
  }
  if (u.includes('4400') || u.includes('4018')) {
    return 'KaziAvance is not reachable. Check KAZI_API_URL on the TichaPortal backend.';
  }
  return 'Upstream service is unavailable';
}

async function serviceFetch(baseUrl, path, { method = 'GET', query, body, headers, authorization } = {}) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  const url = new URL(`${root}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'ticha-portal',
        ...(authorization ? { Authorization: authorization } : {}),
        ...(headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ServiceError(503, unavailableMessage(baseUrl));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ServiceError(response.status, payload.message || payload.error || 'Upstream request failed');
  }
  return payload;
}

function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
  return payload;
}

module.exports = { ServiceError, serviceFetch, unwrap };

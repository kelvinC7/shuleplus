const fs = require('fs');
const path = require('path');

function loadBackendEnv() {
  const file = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadBackendEnv();

function env(key, fallback) {
  const v = process.env[key];
  if (v != null && String(v).trim() !== '') return String(v).trim();
  return fallback;
}

module.exports = {
  PORT: env('PORT', '4000'),
  NODE_ENV: env('NODE_ENV', 'development'),
  JWT_ACCESS_SECRET: env('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY: env('SERVICE_API_KEY', env('PLATFORM_SERVICE_KEY', 'dev-service-key')),
  FRONTEND_URL: env('FRONTEND_URL', 'http://localhost:5173'),
  CORS_ORIGIN: env(
    'CORS_ORIGIN',
    'http://localhost:5173,http://localhost:3000,https://ticha.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw'
  ),
  IAM_API_URL: env('IAM_API_URL', 'http://localhost:3001/api/v1'),
  TIMETABLE_API_URL: env('TIMETABLE_API_URL', 'http://localhost:3010/api'),
  STUDENT_MANAGEMENT_API_URL: env(
    'STUDENT_MANAGEMENT_API_URL',
    'http://localhost:3052/api'
  ),
  ACADEMIC_API_URL: env('ACADEMIC_API_URL', 'http://localhost:3003/api'),
  ATTENDANCE_API_URL: env('ATTENDANCE_API_URL', 'http://localhost:3024/api'),
  KAZI_API_URL: env('KAZI_API_URL', 'http://localhost:4400'),
  HR_API_URL: env('HR_API_URL', 'http://localhost:3005/api'),
  PAYROLL_API_URL: env('PAYROLL_API_URL', 'http://localhost:3026/api'),
  STUDENT_DISCIPLINE_API_URL: env('STUDENT_DISCIPLINE_API_URL', 'http://localhost:3032/api'),
  BABYEYI_API_URL: env('BABYEYI_API_URL', 'http://localhost:3012/api'),
  NOTIFICATION_SERVICE_URL: env(
    'NOTIFICATION_SERVICE_URL',
    'http://localhost:3002'
  ),
  PARENT_MIS_API_URL: env('PARENT_MIS_API_URL', 'http://localhost:3048/api'),
  CURRICULUM_API_URL: env('CURRICULUM_API_URL', 'http://localhost:3094/api'),
};

const env = (import.meta as any).env || {};
const configuredBase = env.VITE_API_URL as string | undefined;
const configuredStudentBase = env.VITE_STUDENT_API_URL as string | undefined;
const isDev = Boolean(env.DEV);

export const API_BASE_URL = (
  configuredBase && configuredBase.trim()
    ? configuredBase.trim()
    : isDev
      ? '/api'
      : 'https://parents.shuleplus.rw/api'
).replace(/\/+$/, '');

export const STUDENT_API_BASE_URL = (
  configuredStudentBase && configuredStudentBase.trim()
    ? configuredStudentBase.trim()
    : isDev
      ? '/sm-api'
      : 'https://studentmanagement-api.shuleplus.rw/api'
).replace(/\/+$/, '');

export const STUDENT_API_LOGIN_URL = `${STUDENT_API_BASE_URL}/public/parents/auth/login`;

/** Public babyeyi.rw BFF — all browser calls go here (server proxies to IAM / fees / SM). */
export const BABYEYI_API_BASE = (
  process.env.NEXT_PUBLIC_BABYEYI_API_URL ?? 'http://localhost:3099/api'
).replace(/\/$/, '');

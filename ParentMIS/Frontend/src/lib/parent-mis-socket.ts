/** Socket.IO origin for ParentMIS (strip /api from REST base). */
export function parentMisSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_PARENT_MIS_SOCKET_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const api = (process.env.NEXT_PUBLIC_API_URL ?? 'https://parentsapi.shuleplus.rw/api').replace(/\/$/, '');
  return api.replace(/\/api\/?$/, '') || 'https://parentsapi.shuleplus.rw';
}

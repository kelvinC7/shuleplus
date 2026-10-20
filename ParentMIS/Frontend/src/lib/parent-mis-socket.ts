/** Socket.IO origin for ParentMIS (strip /api from REST base). */
export function parentMisSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_PARENT_MIS_SOCKET_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const api = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3048/api').replace(/\/$/, '');
  return api.replace(/\/api\/?$/, '') || 'http://localhost:3048';
}

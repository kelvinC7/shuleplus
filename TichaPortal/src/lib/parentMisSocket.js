/** ParentMIS Socket.IO origin (no /api suffix). */
export function parentMisSocketUrl() {
  const direct = import.meta.env.VITE_PARENT_MIS_SOCKET_URL?.replace(/\/$/, '');
  if (direct) return direct;
  const api = import.meta.env.VITE_PARENT_MIS_API_URL?.replace(/\/$/, '');
  if (api) return api.replace(/\/api\/?$/, '');
  return 'http://localhost:3048';
}

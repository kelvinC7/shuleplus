import axios from 'axios';

export function formatModuleAccessError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Cannot reach the ShuleTrip API. Start the backend on port 3076 and confirm VITE_API_URL in Frontend_react/.env.';
    }
    const msg = err.response.data?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    return `${fallback} (HTTP ${err.response.status})`;
  }
  return fallback;
}

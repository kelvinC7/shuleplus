import axios from 'axios';

/** Prefer API `message` over generic axios "Request failed with status code 500". */
export function getHttpErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && !/^Request failed with status code \d+$/.test(msg)) {
      return msg;
    }
  }
  return fallback;
}

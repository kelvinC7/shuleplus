import {
  captureTokenFromUrl,
  getToken,
  isTokenExpired,
  refreshAccessToken,
} from "@/shared/auth-token";

export const API_URL = (() => {
  const raw =
    process.env.NEXT_PUBLIC_KAZI_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4400";
  let base = raw.replace(/\/$/, "");
  // Redeploy historically wrote .../api; FE paths already include /api/...
  if (base.endsWith("/api")) base = base.slice(0, -4);

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      /(^|\.)shuleplus\.rw$/i.test(host) &&
      /localhost|127\.0\.0\.1/i.test(base)
    ) {
      return "https://kazi-api.shuleplus.rw";
    }
  }
  return base;
})();

export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("cannot reach kaziadvance api") ||
    msg.includes("networkerror") ||
    msg.includes("network error") ||
    msg.includes("load failed") ||
    err.name === "TypeError"
  );
}

let refreshPromise: Promise<string | null> | null = null;

async function ensureFreshToken(): Promise<string | null> {
  captureTokenFromUrl();
  const token = getToken();
  if (token && !isTokenExpired()) return token;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  const refreshed = await refreshPromise;
  return refreshed ?? getToken();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const run = async (token: string | null, retrying: boolean): Promise<T> => {
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers,
      });
    } catch (err) {
      if (isNetworkError(err)) {
        throw new Error(
          `Cannot reach KaziAdvance API at ${API_URL}. Start the backend: cd KaziAvance/Backend && npm run dev`
        );
      }
      throw err;
    }

    if (response.status === 401 && !retrying) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return run(refreshed, true);
      }
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? `Request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
  };

  const token = await ensureFreshToken();
  return run(token, false);
}

export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

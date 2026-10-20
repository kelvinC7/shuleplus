import { API_URL } from "@/lib/api";
import { getToken, refreshAccessToken, isTokenExpired } from "@/shared/auth-token";

async function fetchAuthenticatedBlob(path: string) {
  let token = getToken();
  if (!token || isTokenExpired()) {
    token = (await refreshAccessToken()) ?? getToken();
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return { blob, filename: match?.[1] ?? null };
}

/** Authenticated download that triggers a browser file save. */
export async function downloadAuthenticated(path: string, fallbackName: string) {
  const { blob, filename } = await fetchAuthenticatedBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Open receipt in a new tab (for view / print). */
export async function openAuthenticated(path: string) {
  const { blob } = await fetchAuthenticatedBlob(path);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked — allow popups to view the receipt");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function printAuthenticated(path: string) {
  const { blob } = await fetchAuthenticatedBlob(path);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked — allow popups to print");
  }
  win.addEventListener("load", () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  });
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

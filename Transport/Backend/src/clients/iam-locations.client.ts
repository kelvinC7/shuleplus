import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";

export interface LocationNode {
  id: string;
  name: string;
  code?: string | null;
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  cellId?: string;
}

async function iamPublicFetch<T>(path: string): Promise<T> {
  const base = env.IAM_API_URL.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/public${path}`);
  } catch {
    throw new AppError(502, "Location service (IAM) is unavailable");
  }
  const body = (await response.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string };
  if (!response.ok) {
    throw new AppError(response.status, body.message || "Location request failed");
  }
  return (body.data ?? []) as T;
}

export function listProvinces() {
  return iamPublicFetch<LocationNode[]>("/locations/provinces");
}

export function listDistricts(provinceId: string) {
  return iamPublicFetch<LocationNode[]>(`/locations/provinces/${provinceId}/districts`);
}

export function listSectors(districtId: string) {
  return iamPublicFetch<LocationNode[]>(`/locations/districts/${districtId}/sectors`);
}

export function listCells(sectorId: string) {
  return iamPublicFetch<LocationNode[]>(`/locations/sectors/${sectorId}/cells`);
}

export function listVillages(cellId: string) {
  return iamPublicFetch<LocationNode[]>(`/locations/cells/${cellId}/villages`);
}

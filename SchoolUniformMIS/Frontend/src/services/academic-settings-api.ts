import { iamApi } from "./iam-api";
import type { AcademicSettings } from "@/lib/academic-settings";

/** Same org-wide academic settings as Organization Admin (single source of truth). */
export async function fetchAcademicSettings(): Promise<AcademicSettings> {
  const { data } = await iamApi.get<{ success: boolean; data: AcademicSettings }>(
    "/iam/org/academic-settings",
  );
  return data.data;
}

export async function updateAcademicSettings(
  payload: AcademicSettings,
): Promise<AcademicSettings> {
  const { data } = await iamApi.put<{ success: boolean; data: AcademicSettings }>(
    "/iam/org/academic-settings",
    payload,
  );
  return data.data;
}

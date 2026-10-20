import {
  fetchIamAcademicSettings,
  updateIamAcademicSettings,
  type AcademicSettings,
} from "../clients/iam.client";
import { AppError } from "../middleware/error.middleware";

export class SettingsService {
  async getAcademicSettings(organizationId: string): Promise<AcademicSettings> {
    const fromIam = await fetchIamAcademicSettings(organizationId);
    return (
      fromIam ?? {
        academicYears: [],
        terms: [],
        currentAcademicYear: null,
        currentTerm: null,
      }
    );
  }

  async updateAcademicSettings(
    organizationId: string,
    settings: AcademicSettings
  ): Promise<AcademicSettings> {
    const updated = await updateIamAcademicSettings(organizationId, settings);
    if (!updated) {
      throw new AppError(502, "Failed to update academic settings in organization admin");
    }
    return updated;
  }
}

export const settingsService = new SettingsService();

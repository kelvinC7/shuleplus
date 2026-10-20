import { prisma } from "../config/database";

export interface SettingsInput {
  enableFabricManagement?: boolean;
  enableTailoring?: boolean;
  enableBarcode?: boolean;
  enableQrCodes?: boolean;
  enableAutoStockAlerts?: boolean;
  enableInstallments?: boolean;
  enableDiscounts?: boolean;
  enableParentNotifications?: boolean;
  enableTrackOwnership?: boolean;
  enableMissingAlerts?: boolean;
  enableSizeRecommendations?: boolean;
  receiptSignatureUrl?: string | null;
  receiptStampUrl?: string | null;
}

export class SettingsService {
  async getSettings(organizationId: string) {
    const settings = await prisma.schoolUniformSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
    return settings;
  }

  async updateSettings(organizationId: string, input: SettingsInput) {
    return prisma.schoolUniformSettings.upsert({
      where: { organizationId },
      update: input,
      create: { organizationId, ...input },
    });
  }
}

export const settingsService = new SettingsService();

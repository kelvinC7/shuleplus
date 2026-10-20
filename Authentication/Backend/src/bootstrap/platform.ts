import { prisma } from '../config/database';
import { loadDeveloperPortalSettingsCache } from '../services/developer-portal-settings.service';

export async function bootstrapPlatform(): Promise<void> {
  try {
    const { ensureRootAdmin } = require('../../prisma/seed') as {
      ensureRootAdmin: (client: typeof prisma) => Promise<void>;
    };
    await ensureRootAdmin(prisma);
  } catch (error) {
    console.error('[Bootstrap] Failed to ensure ROOT_ADMIN:', error);
  }

  try {
    await loadDeveloperPortalSettingsCache();
  } catch (error) {
    console.warn('[Bootstrap] Developer portal settings cache not loaded:', error);
  }
}

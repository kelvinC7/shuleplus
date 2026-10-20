import { prisma } from '../config/database';

export type SeiTenantSettings = {
  morningCutoffTime?: string;
  autoRefreshSeconds?: number;
  reportSchedule?: {
    enabled?: boolean;
    email?: string;
    hourLocal?: number;
    lastSentDate?: string;
  };
  notificationRules?: {
    smsEnabled?: boolean;
    emailEnabled?: boolean;
  };
};

const DEFAULTS: SeiTenantSettings = {
  morningCutoffTime: '08:00',
  autoRefreshSeconds: 120,
  reportSchedule: { enabled: false, hourLocal: 8 },
  notificationRules: { smsEnabled: false, emailEnabled: true },
};

export function parseSettings(raw: unknown): SeiTenantSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const s = raw as SeiTenantSettings;
  return {
    morningCutoffTime: s.morningCutoffTime ?? DEFAULTS.morningCutoffTime,
    autoRefreshSeconds: s.autoRefreshSeconds ?? DEFAULTS.autoRefreshSeconds,
    reportSchedule: { ...DEFAULTS.reportSchedule, ...s.reportSchedule },
    notificationRules: { ...DEFAULTS.notificationRules, ...s.notificationRules },
  };
}

export function isMorningCompliant(firstAttendanceTime: string | null, cutoff: string): boolean {
  if (!firstAttendanceTime?.trim()) return false;
  const [ch, cm] = cutoff.split(':').map((x) => parseInt(x, 10));
  const [fh, fm] = firstAttendanceTime.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(ch) || !Number.isFinite(cm) || !Number.isFinite(fh) || !Number.isFinite(fm)) {
    return Boolean(firstAttendanceTime);
  }
  return fh < ch || (fh === ch && fm <= cm);
}

export class SectorSettingsService {
  async get(organizationRef: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: organizationRef, status: 'ACTIVE' },
    });
    return parseSettings(tenant?.settings);
  }

  async update(organizationRef: string, patch: SeiTenantSettings) {
    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: organizationRef, status: 'ACTIVE' },
    });
    if (!tenant) throw new Error('Tenant not found');
    const merged = { ...parseSettings(tenant.settings), ...patch };
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { settings: merged },
    });
    return merged;
  }
}

export const sectorSettingsService = new SectorSettingsService();

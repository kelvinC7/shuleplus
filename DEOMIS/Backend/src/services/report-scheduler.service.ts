import { prisma } from '../config/database';
import { notificationClient } from '../clients/notification.client';
import { parseSettings } from './sector-settings.service';
import { buildDailyReportText } from './sector-report.service';
import { sectorDataService } from './sector-data.service';
import { aggregateFromSchools } from './sector-school.types';

const CHECK_MS = 15 * 60 * 1000;

export function startReportScheduler() {
  setInterval(() => {
    void tickScheduledReports();
  }, CHECK_MS);
  console.log('[SectorMIS] Report scheduler started');
}

async function tickScheduledReports() {
  const tenants = await prisma.tenant.findMany({ where: { status: 'ACTIVE' } });
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);

  for (const tenant of tenants) {
    const settings = parseSettings(tenant.settings);
    const schedule = settings.reportSchedule;
    if (!schedule?.enabled || !schedule.email?.trim()) continue;
    if ((schedule.hourLocal ?? 8) !== hour) continue;
    if (schedule.lastSentDate === today) continue;

    try {
      const loaded = await sectorDataService.loadForTenant(tenant.organizationId);
      const totals = aggregateFromSchools(loaded.schools);
      const observations: string[] = [];
      const notReporting = loaded.schools.filter((s) => !s.reporting).length;
      if (notReporting) observations.push(`${notReporting} school(s) have not reported today.`);
      if (!observations.length) observations.push('Sector attendance report generated automatically.');

      const text = buildDailyReportText({
        sector: loaded.sectorName,
        date: today,
        schools: loaded.schools,
        totals,
        observations,
      });

      if (notificationClient.isEnabled()) {
        await notificationClient.sendEmail({
          to: schedule.email.trim(),
          subject: `SEI daily attendance report · ${loaded.sectorName} · ${today}`,
          body: text,
        });
      }

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          settings: {
            ...settings,
            reportSchedule: { ...schedule, lastSentDate: today },
          },
        },
      });
    } catch (err) {
      console.warn('[SectorMIS] Scheduled report failed', tenant.organizationId, err);
    }
  }
}

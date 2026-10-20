'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { PageShell, KpiGrid, Panel } from '@/components/attendance-ui';
import { StatusBadge } from '@/components/status-badge';
import { attendanceApi } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function ExceptionsView() {
  const toast = useToast();
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof attendanceApi.alerts>>['data']['data']>([]);
  const [kpis, setKpis] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const [{ data: a }, { data: dash }] = await Promise.all([
        attendanceApi.alerts(),
        attendanceApi.dashboard(),
      ]);
      setAlerts(a.data);
      setKpis(dash.data.kpis ?? {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load exceptions'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const unknownCards = alerts.filter((a) => /unknown|unauthorized/i.test(a.title + a.message)).length;

  return (
    <PageShell
      title="Exceptions"
      subtitle="Unknown cards, duplicates, and device issues"
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <KpiGrid
        columns={3}
        items={[
          { label: 'Unknown cards', value: unknownCards, icon: <ShieldAlert size={18} /> },
          { label: 'Security alerts', value: kpis.securityAlerts ?? alerts.length },
          { label: 'Offline readers', value: kpis.devicesOffline ?? 0 },
          { label: 'Blocked cards', value: kpis.blockedCards ?? 0 },
        ]}
      />

      <Panel title="Active exceptions">
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{a.title}</p>
                  <p className="mt-1 text-sm text-muted">{a.message}</p>
                  <p className="mt-2 text-[10px] text-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={a.severity} />
              </div>
              {!a.resolved ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-primary !py-1.5 text-xs"
                    onClick={() => void attendanceApi.resolveAlert(a.id).then(load)}
                  >
                    Resolve
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {alerts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">No open exceptions.</p>
          ) : null}
        </div>
      </Panel>
    </PageShell>
  );
}

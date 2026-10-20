'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cpu, Radio, RefreshCw, Trash2, Wifi } from 'lucide-react';
import { PageShell, KpiGrid, Panel, TabBar, GateStatusCard } from '@/components/attendance-ui';
import { StatusBadge } from '@/components/status-badge';
import { attendanceApi, type RfidDevice } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function DevicesGatesView() {
  const toast = useToast();
  const [devices, setDevices] = useState<RfidDevice[]>([]);
  const [tab, setTab] = useState('devices');
  const [selected, setSelected] = useState<RfidDevice | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.liveMonitor();
      setDevices(data.data.devices ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load devices'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, [load]);

  const online = devices.filter((d) => d.status === 'ONLINE').length;
  const offline = devices.filter((d) => d.status === 'OFFLINE').length;

  const gates = Array.from(
    new Map(
      devices.map((d) => [
        d.gateName || d.location || d.name,
        {
          name: d.gateName || d.location || d.name,
          status: d.status,
          deviceCode: d.deviceCode,
          lastSeenAt: d.lastSeenAt,
        },
      ])
    ).values()
  );

  return (
    <PageShell
      title="Devices & Gates"
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <KpiGrid
        columns={3}
        items={[
          { label: 'Online', value: online, icon: <Radio size={18} /> },
          { label: 'Offline', value: offline, icon: <Cpu size={18} /> },
          { label: 'Total readers', value: devices.length, icon: <Wifi size={18} /> },
        ]}
      />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'devices', label: 'Devices' },
          { id: 'gates', label: 'Gates' },
        ]}
      />

      {tab === 'gates' ? (
        <Panel title="Gates">
          <div className="grid gap-2 sm:grid-cols-2">
            {gates.length ? (
              gates.map((g) => (
                <GateStatusCard
                  key={g.name}
                  name={g.name}
                  status={g.status}
                  deviceCode={g.deviceCode}
                  lastSeenAt={g.lastSeenAt}
                />
              ))
            ) : (
              <p className="text-sm text-muted">No gates configured.</p>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Readers">
            <div className="space-y-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelected(d)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selected?.id === d.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-navy">{d.name}</p>
                      <p className="font-mono text-[10px] text-muted">{d.deviceCode}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                </button>
              ))}
              {devices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No devices for this school yet.</p>
              ) : null}
            </div>
          </Panel>

          <div className="lg:col-span-2">
            <Panel title="Device details">
              {selected ? (
                <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-muted">Device</dt>
                    <dd className="font-bold text-navy">{selected.name}</dd>
                    <dd className="font-mono text-xs">{selected.deviceCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Gate</dt>
                    <dd>{selected.gateName || selected.location || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Battery</dt>
                    <dd>{selected.batteryPercent != null ? `${selected.batteryPercent}%` : '·'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Signal</dt>
                    <dd>{selected.signalQuality || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Events today</dt>
                    <dd>{selected.studentsToday ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Firmware</dt>
                    <dd>{selected.firmwareVersion || '-'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted">Last seen</dt>
                    <dd>
                      {selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString() : '·'}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="btn-secondary mt-4 !border-red-200 !text-red-700 hover:!bg-red-50"
                  onClick={() => {
                    if (!window.confirm(`Remove device ${selected.deviceCode}?`)) return;
                    void attendanceApi.deleteDevice(selected.id).then(() => {
                      toast.success('Device removed');
                      setSelected(null);
                      void load();
                    }).catch((err) => toast.error(getApiErrorMessage(err, 'Could not delete device')));
                  }}
                >
                  <Trash2 size={16} /> Delete device
                </button>
                </>
              ) : (
                <p className="text-sm text-muted">Select a device to view telemetry.</p>
              )}
            </Panel>
          </div>
        </div>
      )}
    </PageShell>
  );
}

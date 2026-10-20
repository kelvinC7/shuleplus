'use client';

import { useCallback, useEffect, useState } from 'react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DevicePageLayout } from '@/components/device-page-layout';
import { deviceApi } from '@/services/device-api';
import type { DeviceCommand, RfidDevice } from '@/types';

const COMMAND_GROUPS = [
  {
    title: 'Connectivity',
    commands: ['TEST_INTERNET', 'RECONNECT_WIFI', 'CHANGE_WIFI', 'TEST_SERVER', 'SYNC_NOW'],
  },
  {
    title: 'Time',
    commands: ['SYNC_TIME', 'SET_TIMEZONE', 'ENABLE_AUTO_TIME', 'CONFIGURE_NTP'],
  },
  {
    title: 'Device',
    commands: ['RESTART', 'SHUTDOWN', 'FACTORY_RESET', 'CLEAR_CACHE', 'CLEAR_SYNCED_EVENTS', 'REFRESH_CONFIG'],
  },
  {
    title: 'RFID',
    commands: ['ENABLE_READER', 'DISABLE_READER', 'TEST_READER', 'ADJUST_TIMEOUT', 'DUPLICATE_PROTECTION', 'SCAN_INTERVAL'],
  },
  {
    title: 'Firmware',
    commands: ['CHECK_UPDATE', 'DOWNLOAD_FIRMWARE', 'INSTALL_FIRMWARE', 'SCHEDULE_UPDATE'],
  },
];

const DESTRUCTIVE = new Set(['FACTORY_RESET', 'CLEAR_SYNCED_EVENTS', 'SHUTDOWN']);

export function CommandsView() {
  const [devices, setDevices] = useState<RfidDevice[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<DeviceCommand[]>([]);
  const [targetDevice, setTargetDevice] = useState('');

  const load = useCallback(async () => {
    const [dRes, cRes] = await Promise.all([
      deviceApi.devices({ limit: 50 }),
      deviceApi.commands({ limit: 10 }),
    ]);
    setDevices(dRes.data.data ?? []);
    setHistory(cRes.data.data ?? []);
    if (!targetDevice && dRes.data.data?.[0]) setTargetDevice(dRes.data.data[0].id);
  }, [targetDevice]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(command: string) {
    const confirmed = DESTRUCTIVE.has(command) ? window.confirm(`Confirm destructive command: ${command}?`) : true;
    if (!confirmed) return;
    const ids = selected.size > 0 ? Array.from(selected) : targetDevice ? [targetDevice] : [];
    if (ids.length === 0) return;
    if (ids.length === 1) {
      await deviceApi.sendCommand(ids[0], { command, confirmed: true });
    } else {
      await deviceApi.bulkCommand({ deviceIds: ids, command, confirmed: true });
    }
    await load();
  }

  const historyColumns: DeviceTableColumn<DeviceCommand>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono text-xs">{c.commandCode}</span>,
    },
    {
      key: 'command',
      header: 'Command',
      render: (c) => <span className="font-semibold">{c.command.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'device',
      header: 'Device',
      hideOnMobile: true,
      render: (c) => c.device?.deviceCode ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <span className="text-emerald-700">{c.status}</span>,
    },
  ];

  return (
    <DevicePageLayout subtitle="Send remote commands to one or many readers">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="hr-card space-y-3 p-5 lg:col-span-1">
          <h2 className="font-bold text-navy">Target Device</h2>
          <select className="input" value={targetDevice} onChange={(e) => setTargetDevice(e.target.value)}>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.deviceCode} — {d.location}</option>
            ))}
          </select>
          <h3 className="pt-2 text-xs font-bold uppercase text-muted">Bulk selection</h3>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {devices.map((d) => (
              <li key={d.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(d.id)) next.delete(d.id);
                        else next.add(d.id);
                        return next;
                      });
                    }}
                  />
                  {d.deviceCode}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {COMMAND_GROUPS.map((g) => (
            <div key={g.title} className="hr-card p-5">
              <h2 className="mb-3 font-bold text-navy">{g.title}</h2>
              <div className="flex flex-wrap gap-2">
                {g.commands.map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${DESTRUCTIVE.has(cmd) ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-border hover:bg-slate-50'}`}
                    onClick={() => void run(cmd)}
                  >
                    {cmd.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-navy">Recent Commands</h2>
        <DeviceDataTable
          columns={historyColumns}
          data={history}
          rowKey={(c) => c.id}
          emptyMessage="No commands sent yet"
          minWidth={560}
        />
      </div>
    </DevicePageLayout>
  );
}

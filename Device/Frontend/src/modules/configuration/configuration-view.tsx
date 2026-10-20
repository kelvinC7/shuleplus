'use client';

import { useCallback, useEffect, useState } from 'react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DeviceFormModal } from '@/components/device-form-modal';
import { DevicePageLayout } from '@/components/device-page-layout';
import { FormField } from '@/components/forms/form-field';
import { deviceApi } from '@/services/device-api';
import type { ConfigProfile, FirmwareVersion, RfidDevice } from '@/types';

export function ConfigurationView() {
  const [devices, setDevices] = useState<RfidDevice[]>([]);
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [firmware, setFirmware] = useState<FirmwareVersion[]>([]);
  const [selected, setSelected] = useState('');
  const [wifiOpen, setWifiOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });
  const [timeForm, setTimeForm] = useState({ timeZone: 'Africa/Kigali', ntpServer: 'pool.ntp.org', autoSync: true });

  const load = useCallback(async () => {
    const [dRes, pRes, fRes] = await Promise.all([
      deviceApi.devices({ limit: 20 }),
      deviceApi.profiles(),
      deviceApi.firmware(),
    ]);
    setDevices(dRes.data.data ?? []);
    setProfiles(pRes.data.data ?? []);
    setFirmware(fRes.data.data ?? []);
    if (!selected && dRes.data.data?.[0]) setSelected(dRes.data.data[0].id);
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  const device = devices.find((d) => d.id === selected);

  useEffect(() => {
    if (!device) return;
    setWifiForm({ ssid: device.wifiSsid ?? '', password: '' });
    setTimeForm({
      timeZone: device.timeZone ?? 'Africa/Kigali',
      ntpServer: 'pool.ntp.org',
      autoSync: true,
    });
  }, [device, wifiOpen, timeOpen]);

  const firmwareColumns: DeviceTableColumn<FirmwareVersion>[] = [
    {
      key: 'version',
      header: 'Version',
      render: (f) => <span className="font-mono">{f.version}</span>,
    },
    {
      key: 'devices',
      header: 'Devices',
      render: (f) => f.deviceCount,
    },
    {
      key: 'status',
      header: 'Status',
      render: (f) => f.status.replace(/_/g, ' '),
    },
  ];

  return (
    <DevicePageLayout subtitle="Wi-Fi, time settings and configuration profiles">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="hr-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-navy">Wi-Fi Configuration</h2>
            <button type="button" className="btn-secondary text-xs" disabled={!device} onClick={() => setWifiOpen(true)}>
              Configure Wi-Fi
            </button>
          </div>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deviceCode}
              </option>
            ))}
          </select>
          {device ? (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm">
              <p className="font-semibold text-emerald-800">Connected</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted">Network</dt>
                  <dd>{device.wifiSsid}</dd>
                </div>
                <div>
                  <dt className="text-muted">Signal</dt>
                  <dd>{device.wifiSignalDbm} dBm</dd>
                </div>
                <div>
                  <dt className="text-muted">IP</dt>
                  <dd>{device.ipAddress}</dd>
                </div>
                <div>
                  <dt className="text-muted">Internet</dt>
                  <dd>{device.serverConnected ? 'Connected' : 'Offline'}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="hr-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-navy">Time Settings</h2>
            <button type="button" className="btn-secondary text-xs" disabled={!device} onClick={() => setTimeOpen(true)}>
              Edit Time Settings
            </button>
          </div>
          {device ? (
            <>
              <p className="text-lg font-semibold">
                {device.deviceClock ? new Date(device.deviceClock).toLocaleString() : '—'}
              </p>
              <p className="text-xs">{device.clockSynced ? 'Time synchronized' : 'Clock out of sync'}</p>
              <p className="text-xs text-muted">Time zone: {device.timeZone ?? 'Africa/Kigali'}</p>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => device && void deviceApi.sendCommand(device.id, { command: 'SYNC_TIME' })}
              >
                Sync Time Now
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="hr-card p-5">
        <h2 className="mb-3 font-bold text-navy">Configuration Profiles</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {profiles.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-4">
              <p className="font-semibold text-navy">{p.name}</p>
              <p className="mt-1 text-xs text-muted">{p.description}</p>
              <p className="mt-2 text-xs">{p.deviceCount} devices</p>
              <button type="button" className="btn-secondary mt-3 text-xs">
                Apply Profile → {p.deviceCount} Devices
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-navy">Firmware Versions</h2>
        <DeviceDataTable
          columns={firmwareColumns}
          data={firmware}
          rowKey={(f) => f.id}
          emptyMessage="No firmware versions"
          minWidth={480}
        />
      </div>

      <DeviceFormModal
        open={wifiOpen}
        onOpenChange={setWifiOpen}
        title="Configure Wi-Fi"
        description={device ? `Update network settings for ${device.deviceCode}` : undefined}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setWifiOpen(false);
          }}
        >
          <FormField label="Wi-Fi SSID">
            <input
              className="input"
              value={wifiForm.ssid}
              onChange={(e) => setWifiForm({ ...wifiForm, ssid: e.target.value })}
            />
          </FormField>
          <FormField label="Password">
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={wifiForm.password}
              onChange={(e) => setWifiForm({ ...wifiForm, password: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setWifiOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Test & Save Connection
            </button>
          </div>
        </form>
      </DeviceFormModal>

      <DeviceFormModal
        open={timeOpen}
        onOpenChange={setTimeOpen}
        title="Time Settings"
        description={device ? `Clock configuration for ${device.deviceCode}` : undefined}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (device) void deviceApi.sendCommand(device.id, { command: 'SYNC_TIME' });
            setTimeOpen(false);
          }}
        >
          <FormField label="Time Zone">
            <input
              className="input"
              value={timeForm.timeZone}
              onChange={(e) => setTimeForm({ ...timeForm, timeZone: e.target.value })}
            />
          </FormField>
          <FormField label="NTP Server">
            <input
              className="input"
              value={timeForm.ntpServer}
              onChange={(e) => setTimeForm({ ...timeForm, ntpServer: e.target.value })}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={timeForm.autoSync}
              onChange={(e) => setTimeForm({ ...timeForm, autoSync: e.target.checked })}
            />
            Automatic time sync
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setTimeOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save & Sync
            </button>
          </div>
        </form>
      </DeviceFormModal>
    </DevicePageLayout>
  );
}

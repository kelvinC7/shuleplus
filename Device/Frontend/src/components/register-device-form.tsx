'use client';

import { useCallback, useEffect, useState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { deviceApi } from '@/services/device-api';

const defaultForm = {
  deviceName: '',
  deviceCode: '',
  serialNumber: '',
  deviceType: 'Gate Reader',
  firmwareVersion: 'v2.4.1',
  location: '',
  gateEntrance: '',
  attendanceZone: '',
  installationDate: new Date().toISOString().slice(0, 10),
  ipAddress: '',
  macAddress: '',
  wifiSsid: 'School-WiFi',
  timeZone: 'Africa/Kigali',
};

interface RegisterDeviceFormProps {
  onSuccess: (deviceId: string) => void;
  onCancel: () => void;
}

export function RegisterDeviceForm({ onSuccess, onCancel }: RegisterDeviceFormProps) {
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);
  const [error, setError] = useState('');
  const [codeMeta, setCodeMeta] = useState<{
    districtCode: string;
    schoolCode: string;
    district: string | null;
  } | null>(null);
  const [form, setForm] = useState(defaultForm);

  const loadNextCode = useCallback(async () => {
    setLoadingCode(true);
    setError('');
    try {
      const { data } = await deviceApi.nextDeviceCode();
      const preview = data.data;
      setForm((prev) => ({ ...prev, deviceCode: preview.deviceCode }));
      setCodeMeta({
        districtCode: preview.districtCode,
        schoolCode: preview.schoolCode,
        district: preview.district,
      });
    } catch {
      setError('Could not generate device ID. Check that your school profile has district and school code.');
    } finally {
      setLoadingCode(false);
    }
  }, []);

  useEffect(() => {
    void loadNextCode();
  }, [loadNextCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await deviceApi.createDevice(form);
      onSuccess(data.data.id);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to register device';
      setError(message);
      await loadNextCode();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="register-device-form" onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {error}
        </div>
      ) : null}

      <FormField label="Device Name" required>
        <input
          className="input"
          required
          value={form.deviceName}
          onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
        />
      </FormField>

      <div>
        <FormField label="Device ID (auto-generated)">
          <input
            className="input bg-slate-50 font-mono text-sm"
            readOnly
            value={loadingCode ? 'Generating…' : form.deviceCode}
          />
        </FormField>
        {codeMeta ? (
          <p className="mt-1 text-[11px] text-muted">
            District {codeMeta.districtCode}
            {codeMeta.district ? ` (${codeMeta.district})` : ''} · School {codeMeta.schoolCode} · Format{' '}
            {codeMeta.districtCode}
            {codeMeta.schoolCode}DV###
          </p>
        ) : null}
      </div>

      <FormField label="Serial Number">
        <input
          className="input"
          value={form.serialNumber}
          onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
        />
      </FormField>
      <FormField label="Device Type">
        <input
          className="input"
          value={form.deviceType}
          onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
        />
      </FormField>
      <FormField label="Firmware Version">
        <input
          className="input"
          value={form.firmwareVersion}
          onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })}
        />
      </FormField>
      <FormField label="Location" required>
        <input
          className="input"
          required
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </FormField>
      <FormField label="Gate / Entrance">
        <input
          className="input"
          value={form.gateEntrance}
          onChange={(e) => setForm({ ...form, gateEntrance: e.target.value })}
        />
      </FormField>
      <FormField label="Attendance Zone">
        <input
          className="input"
          value={form.attendanceZone}
          onChange={(e) => setForm({ ...form, attendanceZone: e.target.value })}
        />
      </FormField>
      <FormField label="Installation Date">
        <input
          className="input"
          type="date"
          value={form.installationDate}
          onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
        />
      </FormField>
      <FormField label="IP Address">
        <input
          className="input"
          value={form.ipAddress}
          onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
        />
      </FormField>
      <FormField label="MAC Address">
        <input
          className="input"
          value={form.macAddress}
          onChange={(e) => setForm({ ...form, macAddress: e.target.value })}
        />
      </FormField>
      <FormField label="Wi-Fi SSID">
        <input
          className="input"
          value={form.wifiSsid}
          onChange={(e) => setForm({ ...form, wifiSsid: e.target.value })}
        />
      </FormField>
      <FormField label="Time Zone">
        <input
          className="input"
          value={form.timeZone}
          onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
        />
      </FormField>
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving || loadingCode || !form.deviceCode}>
          {saving ? 'Saving…' : 'Register Device'}
        </button>
      </div>
    </form>
  );
}

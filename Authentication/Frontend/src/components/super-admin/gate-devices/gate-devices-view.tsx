'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  Cpu,
  KeyRound,
  Loader2,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Sparkles,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import {
  SchoolListEmptyState,
  SmartAccessSchoolToolbar,
  type SchoolFilterValues,
} from '@/components/super-admin/smart-access/smart-access-school-toolbar';
import { SchoolLogo } from '@/components/super-admin/smart-access/school-logo';
import {
  buildArduinoSnippet,
  isGateDeviceOnline,
  createGateDevice,
  fetchGateDeviceSchools,
  fetchGateDevices,
  GATE_API_URL,
  rotateGateDeviceApiKey,
  deleteGateDevice,
  updateGateDevice,
  updateGateDeviceWifi,
  type GateDevice,
  type SmartAccessSchool,
} from '@/lib/gate-devices-api';
import { getHttpErrorMessage } from '@/lib/http-error';

const EMPTY_FILTERS: SchoolFilterValues = {
  provinceId: '',
  districtId: '',
  sectorId: '',
  search: '',
};

const SCHOOLS_PAGE_SIZE = 12;

type PanelTab = 'register' | 'devices';
type DeviceTab = 'credentials' | 'wifi';

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' · ');
}

function DeviceStatusPill({
  status,
  lastSeenAt,
}: {
  status: string;
  lastSeenAt?: string | null;
}) {
  const online = isGateDeviceOnline(status, lastSeenAt);
  const label = status === 'DISABLED' ? 'DISABLED' : online ? 'ONLINE' : 'OFFLINE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        online
          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      }`}
      title={lastSeenAt ? `Last seen ${new Date(lastSeenAt).toLocaleString()}` : 'No heartbeat yet'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

function SegmentedTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: React.ReactNode }[];
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-slate-100/90 p-1.5 ring-1 ring-slate-200/80">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              active
                ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80'
                : 'text-muted hover:text-navy'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function ProvisionModal({
  open,
  apiKey,
  deviceCode,
  schoolName,
  onClose,
}: {
  open: boolean;
  apiKey: string;
  deviceCode: string;
  schoolName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<'key' | 'snippet' | null>(null);
  const snippet = buildArduinoSnippet(deviceCode, apiKey);

  if (!open) return null;

  async function handleCopy(kind: 'key' | 'snippet', value: string) {
    await copyText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/20">
        <div className="border-b border-white/10 bg-gradient-to-br from-navy via-navy to-navy-light px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Ready to flash
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{deviceCode}</h2>
              <p className="mt-1 text-sm text-white/75">{schoolName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 text-sm leading-relaxed text-emerald-950">
            Flash the API key once. Wi-Fi is managed here in Super Admin and pulled by the device on
            boot. No command polling needed.
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">API key</p>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-slate-50 p-3">
              <code className="flex-1 break-all font-mono text-sm text-navy">{apiKey}</code>
              <button
                type="button"
                className="btn-secondary shrink-0 !px-3 !py-2"
                onClick={() => void handleCopy('key', apiKey)}
              >
                {copied === 'key' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              ESP32 firmware constants
            </p>
            <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-emerald-100">
              {snippet}
            </pre>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => void handleCopy('snippet', snippet)}
            >
              {copied === 'snippet' ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy firmware config
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-border bg-slate-50/50 px-6 py-4">
          <button type="button" className="btn-primary min-w-[120px]" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceDetailPanel({
  device,
  school,
  onUpdated,
  onProvision,
  onError,
}: {
  device: GateDevice;
  school: SmartAccessSchool;
  onUpdated: () => Promise<void>;
  onProvision: (apiKey: string, deviceCode: string) => void;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<DeviceTab>('credentials');
  const [saving, setSaving] = useState(false);
  const [wifiForm, setWifiForm] = useState({
    wifiSsid: device.wifiSsid ?? '',
    wifiPassword: device.wifiPassword ?? '',
  });

  useEffect(() => {
    setWifiForm({
      wifiSsid: device.wifiSsid ?? '',
      wifiPassword: device.wifiPassword ?? '',
    });
  }, [device.id, device.wifiSsid, device.wifiPassword]);

  async function handleRotate() {
    try {
      const rotated = await rotateGateDeviceApiKey(school.id, device.id);
      onProvision(rotated.apiKey, rotated.deviceCode);
      await onUpdated();
    } catch (err: unknown) {
      onError(getHttpErrorMessage(err, 'Could not rotate key'));
    }
  }

  async function handleSaveWifi() {
    setSaving(true);
    try {
      await updateGateDeviceWifi(school.id, device.id, wifiForm);
      await onUpdated();
    } catch (err: unknown) {
      onError(getHttpErrorMessage(err, 'Could not save Wi-Fi settings'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    try {
      await updateGateDevice(school.id, device.id, {
        status: device.status === 'ONLINE' ? 'DISABLED' : 'ONLINE',
      });
      await onUpdated();
    } catch (err: unknown) {
      onError(getHttpErrorMessage(err, 'Could not update device'));
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${device.deviceCode}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteGateDevice(school.id, device.id);
      await onUpdated();
    } catch (err: unknown) {
      onError(getHttpErrorMessage(err, 'Could not delete device'));
    } finally {
      setSaving(false);
    }
  }

  const snippet = device.apiKey ? buildArduinoSnippet(device.deviceCode, device.apiKey) : '';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-border bg-gradient-to-r from-slate-50 to-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-white shadow-md shadow-navy/15">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-navy">{device.name}</p>
              <p className="font-mono text-xs text-muted">{device.deviceCode}</p>
            </div>
          </div>
          <DeviceStatusPill status={device.status} lastSeenAt={device.lastSeenAt} />
        </div>
      </div>

      <div className="p-4">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          items={[
            {
              id: 'credentials',
              label: (
                <>
                  <KeyRound className="h-4 w-4" />
                  API key
                </>
              ),
            },
            {
              id: 'wifi',
              label: (
                <>
                  <Wifi className="h-4 w-4" />
                  Wi-Fi
                </>
              ),
            },
          ]}
        />

        {tab === 'credentials' ? (
          <div className="mt-4 space-y-4">
            {device.apiKey ? (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">API key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs text-navy">{device.apiKey}</code>
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2"
                    onClick={() => void copyText(device.apiKey!)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <p className="text-xs text-muted">
              Gate endpoint{' '}
              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-navy">{GATE_API_URL}</code>
            </p>

            {snippet ? (
              <pre className="max-h-40 overflow-auto rounded-2xl bg-slate-900 p-3 text-[10px] leading-relaxed text-emerald-100">
                {snippet}
              </pre>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary !py-2 text-xs"
                onClick={() => device.apiKey && onProvision(device.apiKey, device.deviceCode)}
              >
                Full config
              </button>
              <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void handleRotate()}>
                <KeyRound className="h-3.5 w-3.5" />
                New key
              </button>
              <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void handleToggleStatus()}>
                {device.status === 'ONLINE' ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                disabled={saving}
                className="btn-secondary !border-red-200 !py-2 text-xs !text-red-700 hover:!bg-red-50"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
              The device fetches these credentials on boot via{' '}
              <code className="font-mono text-[10px]">GET /device_config</code>. Changes apply after
              the next sync or restart.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Wi-Fi network (SSID)</label>
              <input
                className="input"
                placeholder="School Wi-Fi name"
                value={wifiForm.wifiSsid}
                onChange={(e) => setWifiForm({ ...wifiForm, wifiSsid: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Wi-Fi password</label>
              <input
                className="input"
                type="password"
                placeholder="Wi-Fi password"
                value={wifiForm.wifiPassword}
                onChange={(e) => setWifiForm({ ...wifiForm, wifiPassword: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn-primary w-full !py-3"
              disabled={saving || !wifiForm.wifiSsid.trim()}
              onClick={() => void handleSaveWifi()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4" />
                  Save Wi-Fi settings
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolDevicesPanel({
  school,
  onClose,
}: {
  school: SmartAccessSchool;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('register');
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provision, setProvision] = useState<{ apiKey: string; deviceCode: string } | null>(null);
  const [deviceName, setDeviceName] = useState('');

  const schoolMeta = joinMeta([school.district, school.sector, school.organizationCode]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchGateDevices(school.id);
      setDevices(list);
      setSelectedDeviceId((prev) => {
        if (prev && list.some((d) => d.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Could not load devices');
    } finally {
      setLoading(false);
    }
  }, [school.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  function handleClose() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const created = await createGateDevice(school.id, {
        name: deviceName.trim(),
      });
      if (created.apiKey) {
        setProvision({ apiKey: created.apiKey, deviceCode: created.deviceCode });
      }
      setDeviceName('');
      setPanelTab('devices');
      setSelectedDeviceId(created.id);
      await load();
    } catch (err: unknown) {
      setError(getHttpErrorMessage(err, 'Could not register device'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] flex justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className={`absolute inset-0 bg-navy/30 backdrop-blur-[3px] transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`relative flex h-full w-full max-w-full flex-col bg-slate-50 shadow-[-12px_0_48px_rgba(0,4,53,0.18)] transition-transform duration-300 ease-out lg:max-w-xl ${
            visible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="shrink-0 border-b border-border bg-white px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-border">
                <SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" iconClassName="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Gate devices</p>
                <h2 className="truncate text-lg font-bold text-navy">{school.name}</h2>
                {schoolMeta ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {schoolMeta}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <SegmentedTabs
                value={panelTab}
                onChange={setPanelTab}
                items={[
                  {
                    id: 'register',
                    label: (
                      <>
                        <Plus className="h-4 w-4" />
                        Register
                      </>
                    ),
                  },
                  {
                    id: 'devices',
                    label: (
                      <>
                        <Radio className="h-4 w-4" />
                        Devices ({devices.length})
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {panelTab === 'register' ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border bg-gradient-to-r from-primary/10 via-white to-white px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-white shadow-md">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-navy">Register gate reader</h3>
                      <p className="text-xs text-muted">Name only. Code and API key are auto-generated.</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <label className="mb-1.5 block text-xs font-bold text-muted">Device name</label>
                  <input
                    className="input"
                    placeholder="e.g. Main Gate, Bus Exit"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && deviceName.trim() && void handleCreate()}
                  />
                  <button
                    type="button"
                    className="btn-primary mt-5 w-full !py-3.5 text-base"
                    disabled={saving || !deviceName.trim()}
                    onClick={() => void handleCreate()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Register and generate API key
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-navy">Registered readers</h3>
                  <button
                    type="button"
                    className="btn-ghost !px-2.5 !py-2"
                    onClick={() => void load()}
                    aria-label="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : devices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white py-14 text-center">
                    <Radio className="mx-auto mb-3 h-8 w-8 text-muted/40" />
                    <p className="text-sm font-medium text-navy">No devices yet</p>
                    <p className="mt-1 text-xs text-muted">Use the Register tab to add your first reader.</p>
                    <button type="button" className="btn-secondary mt-4" onClick={() => setPanelTab('register')}>
                      <Plus className="h-4 w-4" />
                      Register device
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {devices.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDeviceId(d.id)}
                          className={`rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 ${
                            selectedDeviceId === d.id
                              ? 'bg-navy text-white shadow-md shadow-navy/20'
                              : 'border border-border bg-white text-muted hover:border-primary/40 hover:text-navy'
                          }`}
                        >
                          <span className="font-semibold">{d.name}</span>
                          <span
                            className={`ml-2 font-mono text-[10px] ${
                              selectedDeviceId === d.id ? 'text-white/70' : 'text-muted'
                            }`}
                          >
                            {d.deviceCode}
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedDevice ? (
                      <DeviceDetailPanel
                        device={selectedDevice}
                        school={school}
                        onUpdated={load}
                        onProvision={(apiKey, deviceCode) => setProvision({ apiKey, deviceCode })}
                        onError={setError}
                      />
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {provision ? (
        <ProvisionModal
          open
          apiKey={provision.apiKey}
          deviceCode={provision.deviceCode}
          schoolName={school.name}
          onClose={() => setProvision(null)}
        />
      ) : null}
    </>
  );
}

export function GateDevicesView() {
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<SmartAccessSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SCHOOLS_PAGE_SIZE);
  const [selectedSchool, setSelectedSchool] = useState<SmartAccessSchool | null>(null);

  const hasFilters = Boolean(
    appliedFilters.provinceId ||
      appliedFilters.districtId ||
      appliedFilters.sectorId ||
      appliedFilters.search.trim()
  );

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      setSchools(
        await fetchGateDeviceSchools({
          provinceId: appliedFilters.provinceId || undefined,
          districtId: appliedFilters.districtId || undefined,
          sectorId: appliedFilters.sectorId || undefined,
          search: appliedFilters.search.trim() || undefined,
        })
      );
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    setPage(1);
  }, [schools.length, appliedFilters, pageSize]);

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  useEffect(() => {
    setAppliedFilters((prev) => ({
      ...prev,
      provinceId: draftFilters.provinceId,
      districtId: draftFilters.districtId,
      sectorId: draftFilters.sectorId,
    }));
  }, [draftFilters.provinceId, draftFilters.districtId, draftFilters.sectorId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, search: draftFilters.search }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftFilters.search]);

  const totalPages = Math.max(1, Math.ceil(schools.length / pageSize));
  const pagedSchools = useMemo(() => {
    const start = (page - 1) * pageSize;
    return schools.slice(start, start + pageSize);
  }, [schools, page, pageSize]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-navy via-navy to-navy-light px-6 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                <Cpu className="h-3.5 w-3.5" />
                Super Admin
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gate Devices</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                Register ESP32 readers per school, generate API keys, and configure Wi-Fi remotely.
                Devices pull settings on boot.
              </p>
            </div>
            <div className="hidden rounded-2xl bg-white/10 px-4 py-3 text-center sm:block">
              <p className="text-2xl font-bold text-primary">{schools.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Schools</p>
            </div>
          </div>
        </div>
      </div>

      <SmartAccessSchoolToolbar
        values={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={applyFilters}
        loading={loading}
        resultCount={schools.length}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : schools.length === 0 ? (
        <SchoolListEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedSchools.map((school) => {
              const meta = joinMeta([school.district, school.organizationCode]);
              return (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => setSelectedSchool(school)}
                  className="group flex flex-col rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-border transition group-hover:ring-primary/30">
                      <SchoolLogo
                        logoUrl={school.logoUrl}
                        name={school.name}
                        className="h-full w-full"
                        iconClassName="h-5 w-5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy transition group-hover:text-primary">
                        {school.name}
                      </p>
                      {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted transition group-hover:bg-primary group-hover:text-navy">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-navy">
                      API keys
                    </span>
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold text-sky-800">
                      Wi-Fi
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="btn-secondary !px-3"
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-muted ring-1 ring-border">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                className="btn-secondary !px-3"
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
              <select
                className="input !w-auto !py-2 text-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[6, 12, 24].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </>
      )}

      {selectedSchool ? (
        <SchoolDevicesPanel school={selectedSchool} onClose={() => setSelectedSchool(null)} />
      ) : null}
    </div>
  );
}

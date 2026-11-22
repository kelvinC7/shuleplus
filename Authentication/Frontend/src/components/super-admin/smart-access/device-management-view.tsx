'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Copy,
  Cpu,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlink,
  UserCog,
  Users,
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
  createGateDevice,
  deleteGateDevice,
  fetchGateDeviceSchools,
  fetchGateDevices,
  fetchGateDeviceSchoolsLinks,
  GATE_API_URL,
  isGateDeviceOnline,
  linkGateDeviceSchool,
  rotateGateDeviceApiKey,
  unlinkGateDeviceSchool,
  updateGateDevice,
  updateGateDeviceWifi,
  type GateDevice,
  type GateDeviceSchoolLink,
  type SmartAccessSchool,
} from '@/lib/gate-devices-api';
import {
  deriveStaffKeyClient,
  fetchDeviceManagementStaff,
  fetchSchoolStaffAssignments,
  fetchStaffAssignments,
  removeStaffSchoolAssignment,
  upsertStaffSchoolAssignments,
  type StaffSchoolAssignment,
} from '@/lib/device-management-api';
import type { SmartAccessStaff } from '@/lib/smart-access-api';
import { getHttpErrorMessage } from '@/lib/http-error';

const EMPTY_FILTERS: SchoolFilterValues = { provinceId: '', districtId: '', sectorId: '', search: '' };
const SCHOOLS_PAGE_SIZE = 12;

type MainTab = 'devices' | 'staff';
type PanelTab = 'register' | 'devices';

function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' • ');
}
async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); } catch {}
}

function DeviceStatusPill({ status, lastSeenAt }: { status: string; lastSeenAt?: string | null }) {
  const online = isGateDeviceOnline(status, lastSeenAt);
  const label = status === 'DISABLED' ? 'DISABLED' : online ? 'ONLINE' : 'OFFLINE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        online ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      }`}
      title={lastSeenAt ? `Last seen ${new Date(lastSeenAt).toLocaleString()}` : 'No heartbeat yet'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: React.ReactNode }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-slate-100/90 p-1.5 ring-1 ring-slate-200/80">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            value === item.id ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80' : 'text-muted hover:text-navy'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ProvisionModal({
  open, apiKey, deviceCode, schoolName, onClose,
}: { open: boolean; apiKey: string; deviceCode: string; schoolName: string; onClose: () => void }) {
  const [copied, setCopied] = useState<'key' | 'snippet' | null>(null);
  const snippet = buildArduinoSnippet(deviceCode, apiKey);
  if (!open) return null;
  async function handleCopy(kind: 'key' | 'snippet', value: string) {
    await copyText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 1800);
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-white/10 bg-gradient-to-br from-navy to-navy-light px-6 py-6 text-white flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{deviceCode}</h2>
            <p className="mt-1 text-sm text-white/75">{schoolName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 overflow-y-auto p-6">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 p-4 text-sm text-emerald-950">
            Flash the API key once. Wi-Fi is managed in Super Admin and pulled by the device. Shared devices use the same key and attribute each tap to the correct linked school.
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">API key</p>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-slate-50 p-3">
              <code className="flex-1 break-all font-mono text-sm text-navy">{apiKey}</code>
              <button type="button" className="btn-secondary shrink-0 !px-3 !py-2" onClick={() => void handleCopy('key', apiKey)}>
                {copied === 'key' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">ESP32 firmware constants</p>
            <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-emerald-100">{snippet}</pre>
            <button type="button" className="btn-secondary mt-3" onClick={() => void handleCopy('snippet', snippet)}>
              {copied === 'snippet' ? <><Check className="h-4 w-4 text-emerald-600" /> Copied</> : <><Copy className="h-4 w-4" /> Copy firmware config</>}
            </button>
          </div>
        </div>
        <div className="flex justify-end border-t border-border bg-slate-50/50 px-6 py-4">
          <button type="button" className="btn-primary min-w-[120px]" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function DeviceLinksPanel({
  school,
  device,
  allSchools,
  links,
  loading,
  onRefresh,
  onError,
}: {
  school: SmartAccessSchool;
  device: GateDevice;
  allSchools: SmartAccessSchool[];
  links: GateDeviceSchoolLink[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const linkedIds = new Set((links.length ? links : (device.linkedOrganizationIds || []).map((id) => ({ organizationId: id })) as any).map((l: any) => l.organizationId));
  linkedIds.add(device.primaryOrganizationId || device.organizationId || school.id);
  const options = allSchools.filter((s) => !linkedIds.has(s.id));

  async function handleLink() {
    if (!target) return;
    setBusy(true);
    try {
      await linkGateDeviceSchool(school.id, device.id, target);
      setTarget('');
      await onRefresh();
    } catch (e) { onError(getHttpErrorMessage(e, 'Could not link school')); }
    finally { setBusy(false); }
  }
  async function handleUnlink(schoolId: string) {
    if (!window.confirm('Remove this school from this shared device?')) return;
    setBusy(true);
    try {
      await unlinkGateDeviceSchool(school.id, device.id, schoolId);
      await onRefresh();
    } catch (e) { onError(getHttpErrorMessage(e, 'Could not unlink school')); }
    finally { setBusy(false); }
  }

  const effectiveLinks = links.length ? links : (device.linkedOrganizationIds || [school.id]).map((id) => ({
    deviceId: device.id, organizationId: id, isPrimary: id === (device.primaryOrganizationId || device.organizationId), status: 'ACTIVE'
  }));

  return (
    <div className="mt-4 rounded-2xl border border-border bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-navy flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Linked schools</p>
          <p className="text-xs text-muted mt-0.5">Share this physical device with other schools. Taps are recorded in the correct school (no duplicates/wrong attribution).</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-border">{effectiveLinks.length}</span>
      </div>
      {loading ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="mt-3 space-y-2">
          {effectiveLinks.map((l) => {
            const info = allSchools.find((s) => s.id === l.organizationId);
            const isPrimary = !!l.isPrimary || l.organizationId === (device.primaryOrganizationId || device.organizationId);
            return (
              <div key={l.organizationId} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-border">
                <div className="min-w-0 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{info?.name || l.organizationId}</p>
                    <p className="text-[11px] text-muted">{isPrimary ? 'Primary (owner)' : 'Shared access'}{info?.district ? ` • ${info.district}` : ''}</p>
                  </div>
                </div>
                {!isPrimary && (
                  <button type="button" disabled={busy} className="btn-secondary !px-2.5 !py-1.5 text-xs !text-red-700 !border-red-200" onClick={() => void handleUnlink(l.organizationId)}>
                    <Unlink className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
                {isPrimary && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-navy">PRIMARY</span>}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <select className="input flex-1" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Select school to share with…</option>
          {options.map((s) => <option key={s.id} value={s.id}>{s.name}{s.district ? ` — ${s.district}` : ''}</option>)}
        </select>
        <button type="button" className="btn-primary !py-2.5" disabled={!target || busy} onClick={() => void handleLink()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add school
        </button>
      </div>
      <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2 ring-1 ring-amber-100">
        <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />Staff tap attribution is denied if a staff member is assigned to more than one of this device&apos;s linked schools (ambiguous). Ensure only one applicable linked school per staff per shared device.
      </p>
    </div>
  );
}

function DeviceDetailPanel({
  device, school, allSchools, onUpdated, onProvision, onError,
}: { device: GateDevice; school: SmartAccessSchool; allSchools: SmartAccessSchool[]; onUpdated: () => Promise<void>; onProvision: (k: string, c: string) => void; onError: (m: string) => void }) {
  const [tab, setTab] = useState<'credentials' | 'wifi' | 'links'>('credentials');
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<GateDeviceSchoolLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [wifiForm, setWifiForm] = useState({ wifiSsid: device.wifiSsid ?? '', wifiPassword: device.wifiPassword ?? '' });

  useEffect(() => { setWifiForm({ wifiSsid: device.wifiSsid ?? '', wifiPassword: device.wifiPassword ?? '' }); }, [device.id, device.wifiSsid, device.wifiPassword]);

  const loadLinks = useCallback(async () => {
    setLinksLoading(true);
    try { setLinks(await fetchGateDeviceSchoolsLinks(school.id, device.id)); } catch { setLinks([]); }
    finally { setLinksLoading(false); }
  }, [school.id, device.id]);

  useEffect(() => { if (tab === 'links') void loadLinks(); }, [tab, loadLinks]);

  async function handleRotate() {
    try { const rotated = await rotateGateDeviceApiKey(school.id, device.id); onProvision(rotated.apiKey, rotated.deviceCode); await onUpdated(); }
    catch (e) { onError(getHttpErrorMessage(e, 'Could not rotate key')); }
  }
  async function handleSaveWifi() {
    setSaving(true);
    try { await updateGateDeviceWifi(school.id, device.id, wifiForm); await onUpdated(); }
    catch (e) { onError(getHttpErrorMessage(e, 'Could not save Wi-Fi settings')); }
    finally { setSaving(false); }
  }
  async function handleToggleStatus() {
    try { await updateGateDevice(school.id, device.id, { status: device.status === 'ONLINE' ? 'DISABLED' : 'ONLINE' }); await onUpdated(); }
    catch (e) { onError(getHttpErrorMessage(e, 'Could not update device')); }
  }
  async function handleDelete() {
    if (!window.confirm(`Remove ${device.deviceCode}? ${device.accessRole === 'SHARED' ? 'This will unlink it from this school.' : 'This will delete the physical device registration.'}`)) return;
    setSaving(true);
    try { await deleteGateDevice(school.id, device.id); await onUpdated(); }
    catch (e) { onError(getHttpErrorMessage(e, 'Could not delete/unlink device')); }
    finally { setSaving(false); }
  }
  const snippet = device.apiKey ? buildArduinoSnippet(device.deviceCode, device.apiKey) : '';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-border bg-gradient-to-r from-slate-50 to-white px-4 py-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-white"><Radio className="h-5 w-5" /></div>
          <div>
            <p className="font-bold text-navy">{device.name}</p>
            <p className="font-mono text-xs text-muted">{device.deviceCode}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {device.isShared ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">Shared • {device.linkedSchoolsCount || 1} schools</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Single school</span>}
              {device.accessRole === 'SHARED' ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">Linked to this school</span> : null}
            </div>
          </div>
        </div>
        <DeviceStatusPill status={device.status} lastSeenAt={device.lastSeenAt} />
      </div>
      <div className="p-4">
        <Segmented value={tab} onChange={setTab} items={[
          { id: 'credentials', label: <><KeyRound className="h-4 w-4" /> API key</> },
          { id: 'wifi', label: <><Wifi className="h-4 w-4" /> Wi-Fi</> },
          { id: 'links', label: <><Link2 className="h-4 w-4" /> Schools</> },
        ]} />

        {tab === 'credentials' ? (
          <div className="mt-4 space-y-4">
            {device.apiKey ? (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">API key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs text-navy">{device.apiKey}</code>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => void copyText(device.apiKey!)}><Copy className="h-4 w-4" /></button>
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted">Gate endpoint <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-navy">{GATE_API_URL}</code></p>
            {snippet ? <pre className="max-h-40 overflow-auto rounded-2xl bg-slate-900 p-3 text-[10px] leading-relaxed text-emerald-100">{snippet}</pre> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => device.apiKey && onProvision(device.apiKey, device.deviceCode)}>Full config</button>
              <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void handleRotate()}><KeyRound className="h-3.5 w-3.5" /> New key</button>
              <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void handleToggleStatus()}>{device.status === 'ONLINE' ? 'Disable' : 'Enable'}</button>
              <button type="button" disabled={saving} className="btn-secondary !border-red-200 !py-2 text-xs !text-red-700 hover:!bg-red-50" onClick={() => void handleDelete()}><Trash2 className="h-3.5 w-3.5" /> {device.accessRole === 'SHARED' ? 'Unlink' : 'Delete'}</button>
            </div>
          </div>
        ) : tab === 'wifi' ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900">Device fetches credentials on boot via <code className="font-mono text-[10px]">GET /device_config</code>.</p>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Wi-Fi network (SSID)</label>
              <input className="input" placeholder="School Wi-Fi name" value={wifiForm.wifiSsid} onChange={(e) => setWifiForm({ ...wifiForm, wifiSsid: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Wi-Fi password</label>
              <input className="input" type="password" placeholder="Wi-Fi password" value={wifiForm.wifiPassword} onChange={(e) => setWifiForm({ ...wifiForm, wifiPassword: e.target.value })} />
            </div>
            <button type="button" className="btn-primary w-full !py-3" disabled={saving || !wifiForm.wifiSsid.trim()} onClick={() => void handleSaveWifi()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Wifi className="h-4 w-4" /> Save Wi-Fi settings</>}
            </button>
          </div>
        ) : (
          <DeviceLinksPanel school={school} device={device} allSchools={allSchools} links={links} loading={linksLoading} onRefresh={async () => { await loadLinks(); await onUpdated(); }} onError={onError} />
        )}
      </div>
    </div>
  );
}

function SchoolDevicesPanel({ school, allSchools, onClose }: { school: SmartAccessSchool; allSchools: SmartAccessSchool[]; onClose: () => void }) {
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

  useEffect(() => { const f = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(f); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await fetchGateDevices(school.id);
      setDevices(list);
      setSelectedDeviceId((prev) => (prev && list.some((d) => d.id === prev) ? prev : list[0]?.id ?? null));
    } catch (e) { setError(getHttpErrorMessage(e, 'Could not load devices')); }
    finally { setLoading(false); }
  }, [school.id]);

  useEffect(() => { void load(); }, [load]);
  const selectedDevice = useMemo(() => devices.find((d) => d.id === selectedDeviceId) ?? null, [devices, selectedDeviceId]);
  function handleClose() { setVisible(false); window.setTimeout(onClose, 220); }

  async function handleCreate() {
    setSaving(true); setError(null);
    try {
      const created = await createGateDevice(school.id, { name: deviceName.trim() || 'Gate Reader' });
      if ((created as any).apiKey) setProvision({ apiKey: (created as any).apiKey, deviceCode: (created as any).deviceCode });
      setDeviceName(''); setPanelTab('devices'); setSelectedDeviceId((created as any).id); await load();
    } catch (e) { setError(getHttpErrorMessage(e, 'Could not register device')); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-navy/30 backdrop-blur-[2px] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-navy via-navy to-navy-light px-5 py-5 text-white sm:px-6">
          <button type="button" onClick={handleClose} className="absolute right-4 top-4 rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-4 pr-10">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/10"><SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" iconClassName="h-6 w-6" /></div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate">{school.name}</p>
              {schoolMeta ? <p className="text-sm text-white/70 truncate">{schoolMeta}</p> : null}
              <p className="mt-1 text-xs text-white/60">Device Assignments: register a device under this school (primary) and share it with other schools.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <Segmented value={panelTab} onChange={setPanelTab} items={[
            { id: 'register', label: <><Plus className="h-4 w-4" /> Register device</> },
            { id: 'devices', label: <><Cpu className="h-4 w-4" /> Devices ({devices.length})</> },
          ]} />

          {panelTab === 'register' ? (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-700 ring-1 ring-slate-100">Register a physical gate reader under <strong>{school.name}</strong> (primary school). You can then share the same device with other schools from the Schools tab on the device.</div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">Device name</label>
                <input className="input" placeholder="e.g. Main Gate Reader" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
              </div>
              <button type="button" className="btn-primary w-full !py-3" disabled={saving || !deviceName.trim()} onClick={() => void handleCreate()}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : <><Plus className="h-4 w-4" /> Register device</>}
              </button>
            </div>
          ) : (
            <>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              : devices.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">No devices yet for this school. Register one or link an existing shared device.</div>
              : (
                <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
                  <div className="space-y-2">
                    {devices.map((d) => (
                      <button key={d.id} type="button" onClick={() => setSelectedDeviceId(d.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedDeviceId === d.id ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-white hover:border-primary/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-navy text-sm">{d.name}</p>
                            <p className="font-mono text-[11px] text-muted truncate">{d.deviceCode}</p>
                          </div>
                          <DeviceStatusPill status={d.status} lastSeenAt={d.lastSeenAt} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.isShared ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">Shared</span> : null}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.accessRole === 'PRIMARY' ? 'bg-primary/10 text-navy' : 'bg-sky-100 text-sky-800'}`}>{d.accessRole === 'PRIMARY' ? 'Primary' : 'Linked'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedDevice ? <DeviceDetailPanel device={selectedDevice} school={school} allSchools={allSchools} onUpdated={load} onProvision={(apiKey, deviceCode) => setProvision({ apiKey, deviceCode })} onError={setError} /> : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {provision ? <ProvisionModal open apiKey={provision.apiKey} deviceCode={provision.deviceCode} schoolName={school.name} onClose={() => setProvision(null)} /> : null}
    </>
  );
}

function StaffAssignmentsTab({ school, allSchools }: { school: SmartAccessSchool | null; allSchools: SmartAccessSchool[] }) {
  const [staff, setStaff] = useState<SmartAccessStaff[]>([]);
  const [assignments, setAssignments] = useState<StaffSchoolAssignment[]>([]);
  const [staffAssignmentsByKey, setStaffAssignmentsByKey] = useState<Record<string, StaffSchoolAssignment[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStaffKeys, setSelectedStaffKeys] = useState<Record<string, boolean>>({});
  const [targetSchools, setTargetSchools] = useState<Record<string, boolean>>({});
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!school) { setStaff([]); setAssignments([]); setStaffAssignmentsByKey({}); return; }
    setLoading(true); setError(null);
    try {
      const [st, asg] = await Promise.all([
        fetchDeviceManagementStaff(school.id, { search: search.trim() || undefined }),
        fetchSchoolStaffAssignments(school.id),
      ]);
      setStaff(st || []);
      setAssignments(asg || []);
      setStaffAssignmentsByKey({});
    } catch (e) { setError(getHttpErrorMessage(e, 'Could not load staff assignments')); }
    finally { setLoading(false); }
  }, [school, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelectedStaffKeys({}); setTargetSchools({}); setExpandedStaff(null); setStaffAssignmentsByKey({}); }, [school?.id]);

  const schoolAssignmentsByStaffKey = useMemo(() => {
    const map = new Map<string, StaffSchoolAssignment[]>();
    for (const a of assignments) {
      if (String(a.status).toUpperCase() !== 'ACTIVE') continue;
      const arr = map.get(a.staffKey) || [];
      arr.push(a);
      map.set(a.staffKey, arr);
    }
    return map;
  }, [assignments]);

  const assignmentsByStaffKey = schoolAssignmentsByStaffKey;

  async function loadStaffAssignmentsFor(key: string) {
    try {
      const list = await fetchStaffAssignments(key);
      setStaffAssignmentsByKey((prev) => ({ ...prev, [key]: (list || []).filter((a) => String(a.status).toUpperCase() === 'ACTIVE') }));
    } catch {
      // keep existing/cached
    }
  }

  function toggleExpand(key: string) {
    setExpandedStaff((prev) => {
      const next = prev === key ? null : key;
      if (next) void loadStaffAssignmentsFor(next);
      return next;
    });
  }

  const selectedCount = Object.values(selectedStaffKeys).filter(Boolean).length;
  const selectedTargetIds = Object.keys(targetSchools).filter((k) => targetSchools[k]);

  async function handleAssignSelected() {
    if (!school || selectedCount === 0 || selectedTargetIds.length === 0) return;
    setSaving(true); setError(null);
    try {
      const selectedStaff = staff.filter((s) => selectedStaffKeys[deriveStaffKeyClient(s)]);
      for (const s of selectedStaff) {
        await upsertStaffSchoolAssignments({
          organizationId: school.id,
          staff: {
            ...s,
            staffKey: deriveStaffKeyClient(s),
            externalId: (s as any).employeeNumber || (s as any).id,
            staffName: (s as any).fullName,
            homeOrganizationId: school.id,
          },
          targetOrganizationIds: selectedTargetIds,
          replace: false,
        });
      }
      setSelectedStaffKeys({});
      setTargetSchools({});
      await load();
      if (expandedStaff) await loadStaffAssignmentsFor(expandedStaff);
    } catch (e) { setError(getHttpErrorMessage(e, 'Could not assign staff')); }
    finally { setSaving(false); }
  }

  async function handleRemove(staffKey: string, organizationId: string) {
    if (!window.confirm('Remove this staff-school assignment?')) return;
    setSaving(true);
    try {
      await removeStaffSchoolAssignment(organizationId, staffKey);
      await load();
      await loadStaffAssignmentsFor(staffKey);
    }
    catch (e) { setError(getHttpErrorMessage(e, 'Could not remove assignment')); }
    finally { setSaving(false); }
  }

  async function handleAssignOneToSchools(s: SmartAccessStaff, orgIds: string[]) {
    if (!school || !orgIds.length) return;
    setSaving(true); setError(null);
    try {
      const key = deriveStaffKeyClient(s);
      await upsertStaffSchoolAssignments({
        organizationId: school.id,
        staff: { ...s, staffKey: key, externalId: (s as any).employeeNumber || (s as any).id, staffName: (s as any).fullName, homeOrganizationId: school.id },
        targetOrganizationIds: orgIds,
        replace: false,
      });
      await load();
      await loadStaffAssignmentsFor(key);
    } catch (e) { setError(getHttpErrorMessage(e, 'Could not assign staff')); }
    finally { setSaving(false); }
  }

  if (!school) {
    return <div className="mt-6 rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted">Select a school above to manage staff multi-school assignments.</div>;
  }

  const staffRows = staff;

  return (
    <div className="mt-6 space-y-5">
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-navy flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" /> Staff multi-school assignments</p>
            <p className="text-sm text-muted mt-1">Assign staff to multiple schools without duplicate accounts. Attendance from shared/linked devices is recorded in the correct assigned school.</p>
          </div>
          <button type="button" className="btn-secondary !py-2" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            <ShieldCheck className="inline h-4 w-4 mr-1" /> <strong>Attribution rule:</strong> if a staff member is eligible in more than one school linked to the same shared device, the tap is denied as <code>AMBIGUOUS_STAFF_SCHOOL</code>. Ensure only one of the device&apos;s linked schools applies to that staff (adjust assignments or device links).
          </div>
          <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900 ring-1 ring-sky-100">
            Staff identities are reused from IAM/HR/Timetable (no duplicate accounts). Assignments are synced to Attendance for device tap authorization.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">Search staff in {school.name}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, employee number, RFID..." />
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">Assign selected staff to additional schools</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-auto rounded-xl border border-border p-2 bg-slate-50/50">
              {allSchools.filter((s) => s.id !== school.id).map((s) => (
                <label key={s.id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs cursor-pointer ring-1 ${targetSchools[s.id] ? 'bg-primary/15 text-navy ring-primary/30 font-semibold' : 'bg-white text-muted ring-border'}`}>
                  <input type="checkbox" className="hidden" checked={!!targetSchools[s.id]} onChange={(e) => setTargetSchools((p) => ({ ...p, [s.id]: e.target.checked }))} />
                  {targetSchools[s.id] ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {s.name}
                </label>
              ))}
              {allSchools.filter((s) => s.id !== school.id).length === 0 ? <span className="text-xs text-muted">No other schools available</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary !py-2.5" disabled={saving || selectedCount === 0 || selectedTargetIds.length === 0} onClick={() => void handleAssignSelected()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Assign {selectedCount} staff to {selectedTargetIds.length} school(s)
          </button>
          <span className="text-xs text-muted">{selectedCount} selected • {selectedTargetIds.length} target school(s)</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border bg-slate-50 px-4 py-3 flex items-center justify-between">
          <p className="font-semibold text-navy">Staff in {school.name}</p>
          <span className="text-xs text-muted">{loading ? 'Loading…' : `${staffRows.length} staff`}</span>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : staffRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No staff found for this school.</div>
        ) : (
          <div className="divide-y divide-border">
            {staffRows.map((s) => {
              const key = deriveStaffKeyClient(s);
              const schoolMine = schoolAssignmentsByStaffKey.get(key) || [];
              const mine = staffAssignmentsByKey[key] ?? schoolMine;
              const assignedHere = mine.some((a) => a.organizationId === school.id && String(a.status).toUpperCase() === 'ACTIVE') || schoolMine.some((a) => a.organizationId === school.id);
              const assignedOrgIds = mine.map((a) => a.organizationId);
              const expanded = expandedStaff === key;
              const quickTargets = allSchools.filter((o) => !assignedOrgIds.includes(o.id)).slice(0, 8);
              return (
                <div key={key} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={!!selectedStaffKeys[key]} onChange={(e) => setSelectedStaffKeys((p) => ({ ...p, [key]: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary" />
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">{s.fullName || (s as any).name || 'Staff'}</p>
                        <p className="text-xs text-muted">{[s.position, s.employeeNumber, s.email, s.source ? String(s.source).toUpperCase() : null].filter(Boolean).join(' • ')}</p>
                      </div>
                    </label>
                    <div className="flex-1" />
                    <div className="flex flex-wrap items-center gap-2">
                      {assignedHere ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">Assigned to this school</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Not explicitly assigned</span>}
                      <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => toggleExpand(key)}>{expanded ? 'Hide' : 'Manage schools'}</button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mine.length === 0 ? <span className="text-xs text-muted">No multi-school assignments recorded.</span> : mine.map((a) => {
                      const org = allSchools.find((o) => o.id === a.organizationId);
                      return (
                        <span key={a.id || `${a.organizationId}:${a.staffKey}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-1 text-[11px] text-slate-800 ring-1 ring-slate-200">
                          <Building2 className="h-3 w-3" /> {org?.name || a.organizationId}
                          <button type="button" className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 hover:text-red-700" title="Remove assignment" onClick={() => void handleRemove(a.staffKey, a.organizationId)}><X className="h-3 w-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                  {expanded ? (
                    <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-navy mb-2">Assigned schools & quick add</p>
                      <p className="text-[11px] text-muted mb-2">If this staff member can match more than one school linked to the same shared device, taps will be denied as <code>AMBIGUOUS_STAFF_SCHOOL</code>. Keep only the correct school(s) for each shared device context.</p>
                      <div className="flex flex-wrap gap-2">
                        {quickTargets.length === 0 ? <span className="text-xs text-muted">No additional schools available.</span> : quickTargets.map((o) => (
                          <button key={o.id} type="button" disabled={saving} className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => void handleAssignOneToSchools(s, [o.id])}>
                            <Plus className="h-3 w-3" /> {o.name}
                          </button>
                        ))}
                      </div>
                      {!assignedHere ? (
                        <button type="button" disabled={saving} className="mt-3 btn-secondary !px-3 !py-1.5 text-xs" onClick={() => void handleAssignOneToSchools(s, [school.id])}><Plus className="h-3 w-3" /> Assign to {school.name}</button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function DeviceManagementView() {
  const [mainTab, setMainTab] = useState<MainTab>('devices');
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<SmartAccessSchool[]>([]);
  const [allSchools, setAllSchools] = useState<SmartAccessSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SCHOOLS_PAGE_SIZE);
  const [selectedSchool, setSelectedSchool] = useState<SmartAccessSchool | null>(null);

  const hasFilters = Boolean(appliedFilters.provinceId || appliedFilters.districtId || appliedFilters.sectorId || appliedFilters.search.trim());

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const [list, all] = await Promise.all([
        fetchGateDeviceSchools({ provinceId: appliedFilters.provinceId || undefined, districtId: appliedFilters.districtId || undefined, sectorId: appliedFilters.sectorId || undefined, search: appliedFilters.search.trim() || undefined }),
        fetchGateDeviceSchools({}),
      ]);
      setSchools(list); setAllSchools(all);
    } catch { setSchools([]); }
    finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { void loadSchools(); }, [loadSchools]);
  useEffect(() => { setPage(1); }, [schools.length, appliedFilters, pageSize]);
  useEffect(() => {
    setAppliedFilters((prev) => ({ ...prev, provinceId: draftFilters.provinceId, districtId: draftFilters.districtId, sectorId: draftFilters.sectorId }));
  }, [draftFilters.provinceId, draftFilters.districtId, draftFilters.sectorId]);
  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedFilters((prev) => ({ ...prev, search: draftFilters.search })), 350);
    return () => window.clearTimeout(timer);
  }, [draftFilters.search]);

  function applyFilters() { setAppliedFilters({ ...draftFilters }); }
  function clearFilters() { setDraftFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }

  const totalPages = Math.max(1, Math.ceil(schools.length / pageSize));
  const pagedSchools = useMemo(() => schools.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize), [schools, page, pageSize]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-navy via-navy to-navy-light px-6 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary"><Cpu className="h-3.5 w-3.5" /> Super Admin • Smart Access</div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Device Management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">Register and share gate devices across multiple schools, and assign staff to multiple schools for correct per-school attendance attribution (no duplicate accounts/records).</p>
            </div>
            <div className="hidden rounded-2xl bg-white/10 px-4 py-3 text-center sm:block">
              <p className="text-2xl font-bold text-primary">{schools.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Schools</p>
            </div>
          </div>
          <div className="mt-5">
            <Segmented value={mainTab} onChange={setMainTab} items={[
              { id: 'devices', label: <><Radio className="h-4 w-4" /> Device Assignments</> },
              { id: 'staff', label: <><Users className="h-4 w-4" /> Staff Assignments</> },
            ]} />
          </div>
        </div>
      </div>

      <SmartAccessSchoolToolbar values={draftFilters} onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))} onApply={applyFilters} loading={loading} resultCount={schools.length} />

      {mainTab === 'devices' ? (
        <>
          {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          : schools.length === 0 ? <SchoolListEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pagedSchools.map((school) => {
                  const meta = joinMeta([school.district, school.organizationCode]);
                  return (
                    <button key={school.id} type="button" onClick={() => setSelectedSchool(school)} className="group flex flex-col rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-border"><SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" iconClassName="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-navy group-hover:text-primary">{school.name}</p>
                          {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted group-hover:bg-primary group-hover:text-navy"><ArrowRight className="h-4 w-4" /></div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-navy">Primary & shared devices</span>
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-800">Multi-school links</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {totalPages > 1 ? (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  <button type="button" disabled={page <= 1} className="btn-secondary !px-3" onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></button>
                  <span className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-muted ring-1 ring-border">Page {page} of {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} className="btn-secondary !px-3" onClick={() => setPage((p) => p + 1)}><ChevronLeft className="h-4 w-4 rotate-180" /></button>
                </div>
              ) : null}
            </>
          )}
          {selectedSchool ? <SchoolDevicesPanel school={selectedSchool} allSchools={allSchools.length ? allSchools : schools} onClose={() => setSelectedSchool(null)} /> : null}
        </>
      ) : (
        <>
          <div className="mt-6">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm mb-4">
              <p className="text-sm font-semibold text-navy mb-2">Select school to manage staff assignments</p>
              {loading ? <div className="py-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              : schools.length === 0 ? <p className="text-sm text-muted">No schools match filters.</p>
              : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedSchools.map((school) => (
                    <button key={school.id} type="button" onClick={() => setSelectedSchool(school)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selectedSchool?.id === school.id ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}>
                      <div className="h-10 w-10 rounded-xl bg-slate-50 ring-1 ring-border overflow-hidden flex items-center justify-center"><SchoolLogo logoUrl={school.logoUrl} name={school.name} className="h-full w-full" iconClassName="h-4 w-4" /></div>
                      <div className="min-w-0"><p className="truncate font-semibold text-navy text-sm">{school.name}</p><p className="text-xs text-muted truncate">{joinMeta([school.district, school.organizationCode])}</p></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <StaffAssignmentsTab school={selectedSchool} allSchools={allSchools.length ? allSchools : schools} />
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Search, X } from 'lucide-react';
import { api, ensureAccessToken } from '@/lib/api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  SmsDataPanel,
  SmsPageShell,
  SmsStatusPill,
  SmsTable,
  smsBtnNavy,
  smsBtnOutline,
  smsInputClass,
  smsSelectClass,
} from '@/components/super-admin/sms-bulk/sms-page-shell';

type Row = {
  organizationId: string;
  organizationName: string;
  organizationCode: string | null;
  smsEnabled: boolean;
  maxSegments: number;
  segmentsUsed: number;
  remaining: number;
  quotaPeriod: string;
  parentPackagesEnabled?: boolean;
  momoPayeeNumber?: string | null;
};

export function SchoolSmsAccessView() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatWarning, setChatWarning] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [maxSegments, setMaxSegments] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [period, setPeriod] = useState('MONTHLY');
  const [parentPackages, setParentPackages] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('Not signed in');
      const res = await api.get<{ data: Row[]; meta?: { chatApiOk?: boolean; chatError?: string } }>(
        '/super-admin/sms/school-access',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(res.data.data ?? []);
      const meta = res.data.meta;
      if (meta?.chatApiOk === false) {
        setChatWarning(
          meta.chatError ??
            'ShuleChat API is not reachable. Schools are listed from IAM; saving quota requires InternalChat on the server.'
        );
      } else {
        setChatWarning(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load schools');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.organizationName.toLowerCase().includes(q) ||
        (r.organizationCode ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  function openConfigure(row: Row) {
    setSelected(row);
    setEnabled(row.smsEnabled);
    setMaxSegments(row.maxSegments);
    setPeriod(row.quotaPeriod);
    setParentPackages(Boolean(row.parentPackagesEnabled));
    setMomoNumber(row.momoPayeeNumber ?? '');
    setModalOpen(true);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('Not signed in');
      await api.patch(
        `/super-admin/sms/school-access/${selected.organizationId}`,
        {
          smsEnabled: enabled,
          maxSegments,
          quotaPeriod: period,
          parentPackagesEnabled: parentPackages,
          momoPayeeNumber: momoNumber.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('School SMS settings saved');
      setRows((prev) =>
        prev.map((r) =>
          r.organizationId === selected.organizationId
            ? {
                ...r,
                smsEnabled: enabled,
                maxSegments,
                quotaPeriod: period,
                remaining: Math.max(0, maxSegments - r.segmentsUsed),
                parentPackagesEnabled: parentPackages,
                momoPayeeNumber: momoNumber.trim() || null,
              }
            : r
        )
      );
      setModalOpen(false);
      await load();
    } catch (e) {
      const axiosMsg =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (e as { response: { data: { message: string } } }).response.data.message
          : null;
      toast.error(axiosMsg ?? (e instanceof Error ? e.message : 'Save failed — is ShuleChat API running?'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SmsPageShell
      title="School SMS access"
      description="Enable ShuleChat SMS Center per school and set segment allowance."
    >
      {chatWarning ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{chatWarning}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search schools…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${smsInputClass} pl-9`}
          />
        </div>
        <button type="button" className={smsBtnOutline} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <SmsDataPanel loading={loading}>
        <SmsTable
          headers={['School', 'Code', 'Access', 'Allowance', 'Used', 'Remaining', '']}
          empty={filtered.length === 0}
          emptyLabel={rows.length === 0 ? 'No schools in IAM yet' : 'No schools match your search'}
        >
          {filtered.map((r) => (
            <tr key={r.organizationId} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-navy">{r.organizationName}</td>
              <td className="px-4 py-3 text-muted">{r.organizationCode ?? '—'}</td>
              <td className="px-4 py-3">
                <SmsStatusPill status={r.smsEnabled ? 'ACTIVE' : 'INACTIVE'} />
              </td>
              <td className="px-4 py-3">{r.maxSegments}</td>
              <td className="px-4 py-3">{r.segmentsUsed}</td>
              <td className="px-4 py-3">{r.remaining}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  className={`${smsBtnOutline} !py-1.5 !px-2.5 text-xs`}
                  onClick={() => openConfigure(r)}
                >
                  <Pencil className="mr-1 inline h-3.5 w-3.5" />
                  Configure
                </button>
              </td>
            </tr>
          ))}
        </SmsTable>
      </SmsDataPanel>

      {modalOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-navy/55 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-lg"
            role="dialog"
            aria-labelledby="sms-access-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="sms-access-title" className="text-lg font-semibold text-navy">
                  SMS access
                </h2>
                <p className="text-sm text-muted">{selected.organizationName}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-muted hover:bg-slate-100"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enable SMS sending
              </label>
              <label className="block text-sm text-navy">
                Maximum SMS segments
                <input
                  type="number"
                  min={0}
                  className={`${smsInputClass} mt-1`}
                  value={maxSegments}
                  onChange={(e) => setMaxSegments(Number(e.target.value))}
                />
              </label>
              <label className="block text-sm text-navy">
                Quota period
                <select
                  className={`${smsSelectClass} mt-1 w-full`}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="TERM">Per term</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="ONE_TIME">One-time</option>
                </select>
              </label>
              <p className="text-xs text-muted">
                Used: {selected.segmentsUsed} · Remaining: {selected.remaining}
              </p>
              <hr className="border-border" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Parent portal packages</p>
              <label className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" checked={parentPackages} onChange={(e) => setParentPackages(e.target.checked)} />
                Parents can buy SMS packages
              </label>
              <label className="block text-sm text-navy">
                MTN MoMo payee number
                <input
                  className={`${smsInputClass} mt-1`}
                  placeholder="0781039986"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                />
              </label>
              <p className="text-xs text-muted">
                USSD is built as *182*1*{'{number}'}# unless you set a custom template in InternalChat.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={smsBtnOutline} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className={smsBtnNavy} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SmsPageShell>
  );
}

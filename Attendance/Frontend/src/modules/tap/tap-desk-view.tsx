'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Radio,
  ScanLine,
  User,
  XCircle,
} from 'lucide-react';
import {
  attendanceApi,
  type RfidDevice,
  type TapResult,
} from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

type Props = { direction: 'ENTRY' | 'EXIT' };

function deviceLabel(d: RfidDevice) {
  const gate = d.gateName || d.location || d.name;
  return `${gate} (${d.deviceCode})`;
}

export function TapDeskView({ direction }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [devices, setDevices] = useState<RfidDevice[]>([]);
  const [deviceCode, setDeviceCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<TapResult | null>(null);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);

  useEffect(() => {
    void attendanceApi
      .devices()
      .then(({ data }) => {
        const rows = (data.data ?? []).filter((d) => d.status !== 'DISABLED');
        setDevices(rows);
        setDeviceCode((prev) => {
          if (prev && rows.some((d) => d.deviceCode === prev)) return prev;
          const preferred = rows.find((d) => d.direction === direction && d.status === 'ONLINE')
            ?? rows.find((d) => d.direction === direction)
            ?? rows.find((d) => d.status === 'ONLINE')
            ?? rows[0];
          return preferred?.deviceCode ?? '';
        });
      })
      .catch(() => setDevices([]));
  }, [direction]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [last]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!cardNumber.trim()) {
      toast.error('Scan or enter the smart card UID');
      return;
    }
    setBusy(true);
    setFlash(null);
    try {
      const { data } = await attendanceApi.tap({
        cardNumber: cardNumber.trim(),
        deviceCode: deviceCode.trim() || undefined,
        direction,
      });
      setLast(data.data);
      setFlash('ok');
      const sms = data.data.parentSms;
      if (sms?.status === 'SENT') {
        toast.success(`${data.data.student.name} · ${sms.detail}`, 'Attendance + SMS');
      } else if (sms?.status === 'FAILED') {
        toast.warning(
          `${data.data.student.name} recorded. SMS: ${sms.detail}`,
          'Attendance saved'
        );
      } else {
        toast.success(
          direction === 'ENTRY'
            ? `${data.data.student.name} checked in`
            : `${data.data.student.name} checked out`
        );
      }
      setCardNumber('');
    } catch (err) {
      setFlash('err');
      setLast(null);
      toast.error(getApiErrorMessage(err, 'Tap failed'));
    } finally {
      setBusy(false);
    }
  }

  const isEntry = direction === 'ENTRY';
  const selectedDevice = devices.find((d) => d.deviceCode === deviceCode);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {isEntry ? 'Entry Attendance' : 'Exit Attendance'}
          </h1>
          <p className="mt-1 text-sm text-muted">Scan a card or enter UID</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            isEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
          }`}
        >
          {isEntry ? <LogIn size={14} /> : <LogOut size={14} />}
          {isEntry ? 'Entry mode' : 'Exit mode'}
        </span>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-5 lg:gap-5">
        <form
          onSubmit={(e) => void submit(e)}
          className={`hr-card relative overflow-hidden lg:col-span-3 ${
            flash === 'ok' ? 'ring-2 ring-emerald-400' : flash === 'err' ? 'ring-2 ring-rose-400' : ''
          }`}
        >
          <div
            className={`absolute inset-x-0 top-0 h-1 ${
              isEntry ? 'bg-gradient-to-r from-emerald-400 to-primary' : 'bg-gradient-to-r from-sky-400 to-primary'
            }`}
          />
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-primary">
                <ScanLine size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">Scan smart card</h2>
                <p className="text-xs text-muted">Place card on reader or type the UID</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                Smart card UID *
              </span>
              <input
                ref={inputRef}
                className="input font-mono text-base tracking-wider sm:text-lg"
                autoComplete="off"
                placeholder="e.g. A1B2C3D4"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <Radio size={12} /> Reader device
              </span>
              {devices.length > 0 ? (
                <select
                  className="input font-mono text-sm"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.deviceCode}>
                      {d.status === 'ONLINE' ? '●' : '○'} {deviceLabel(d)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input font-mono text-sm"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                  placeholder="No devices yet - type device code"
                />
              )}
              {selectedDevice ? (
                <p className="mt-1.5 text-[11px] text-muted">
                  Status:{' '}
                  <span
                    className={`font-semibold ${
                      selectedDevice.status === 'ONLINE' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {selectedDevice.status}
                  </span>
                  {selectedDevice.lastSeenAt
                    ? ` · last seen ${new Date(selectedDevice.lastSeenAt).toLocaleTimeString()}`
                    : ''}
                </p>
              ) : null}
            </label>

            <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Process {isEntry ? 'entry' : 'exit'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="hr-card flex flex-col lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Last result</p>
          </div>
          <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
            {last ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={22} className="shrink-0" />
                  <span className="font-bold">{last.access} · {last.direction}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy/5 text-navy">
                    <User size={28} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-navy">{last.student.name}</p>
                    <p className="text-sm text-muted">
                      {last.student.className || '-'}
                      {last.student.level ? ` · ${last.student.level}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Student code</p>
                    <p className="font-mono font-semibold text-navy">{last.student.code || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Card UID</p>
                    <p className="truncate font-mono text-xs font-semibold text-navy">{last.student.cardNumber}</p>
                  </div>
                </div>

                <p className="text-sm">
                  Status: <strong className="text-navy">{last.record.status.replace(/_/g, ' ')}</strong>
                </p>

                {last.parentSms ? (
                  <div
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      last.parentSms.status === 'SENT'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : last.parentSms.status === 'FAILED'
                          ? 'border-amber-200 bg-amber-50 text-amber-950'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MessageSquare size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        Parent SMS · {last.parentSms.status}
                      </p>
                      <p className="text-xs opacity-90">{last.parentSms.detail}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : flash === 'err' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center text-rose-600">
                <XCircle size={40} strokeWidth={1.5} />
                <p className="text-sm font-semibold">Tap denied</p>
                <p className="max-w-xs text-xs text-muted">
                  Check the error toast. Assign the card in Super Admin Smart Access if needed.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-muted">
                  <ScanLine size={28} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-navy">Waiting for scan…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

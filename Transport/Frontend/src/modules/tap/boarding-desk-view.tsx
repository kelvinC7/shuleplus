'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  Radio,
  ScanLine,
  User,
  XCircle,
} from 'lucide-react';
import { transportApi, type TapResult } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

export function BoardingDeskView() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [deviceCode, setDeviceCode] = useState('BUS-014-RFID');
  const [type, setType] = useState<'BOARDING' | 'EXIT'>('BOARDING');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<TapResult | null>(null);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [last]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!cardNumber.trim()) {
      toast.error('Scan or enter the RFID card UID');
      return;
    }
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      const { data } = await transportApi.tap({
        cardNumber: cardNumber.trim(),
        deviceCode: deviceCode.trim() || undefined,
        type,
      });
      setLast(data.data);
      setFlash('ok');
      toast.success(data.data.parentMessage ?? `${data.data.student.name} ${type.toLowerCase()}`);
      setCardNumber('');
    } catch (err) {
      setFlash('err');
      setLast(null);
      const msg = getApiErrorMessage(err, 'Tap failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const isEntry = type === 'BOARDING';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">Boarding & Exit</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Tap a student RFID card. The system checks assigned bus, records boarding or exit, and notifies parents.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${
              isEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-muted'
            }`}
            onClick={() => setType('BOARDING')}
          >
            <LogIn size={14} /> Boarding
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${
              !isEntry ? 'bg-sky-100 text-sky-800' : 'bg-white text-muted'
            }`}
            onClick={() => setType('EXIT')}
          >
            <LogOut size={14} /> Exit
          </button>
        </div>
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
                <h2 className="text-lg font-bold text-navy">RFID TAP</h2>
                <p className="text-xs text-muted">Place card on the bus reader or type the UID</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                Student RFID *
              </span>
              <input
                ref={inputRef}
                className="input font-mono text-base tracking-wider sm:text-lg"
                autoComplete="off"
                placeholder="e.g. RFID-004821"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <Radio size={12} /> Bus RFID reader
              </span>
              <input
                className="input font-mono text-sm"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
              />
            </label>

            <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Process {isEntry ? 'boarding' : 'exit'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            <p className="text-[11px] text-muted">Demo card: RFID-004821 · Reader: BUS-014-RFID</p>
          </div>
        </form>

        <div className="hr-card flex flex-col lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Last result</p>
          </div>
          <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
            {error ? (
              <div className="space-y-2 text-rose-700">
                <div className="flex items-center gap-2 font-bold">
                  <XCircle size={22} /> Action required
                </div>
                <p className="text-sm">{error}</p>
              </div>
            ) : last ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={22} />
                  <span className="font-bold">
                    {last.type === 'BOARDING' ? 'Boarded Successfully' : 'Exited Successfully'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/5">
                    <User size={28} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-navy">{last.student.name}</p>
                    <p className="text-sm text-muted">{last.student.code}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Bus</p>
                    <p className="font-semibold text-navy">{last.bus.code}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Route</p>
                    <p className="font-semibold text-navy">{last.bus.route || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Time</p>
                    <p className="font-semibold text-navy">{formatTime(last.time)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Status</p>
                    <p className="font-semibold text-navy">{last.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {last.parentMessage ? <p className="text-xs text-muted">{last.parentMessage}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Waiting for a tap…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

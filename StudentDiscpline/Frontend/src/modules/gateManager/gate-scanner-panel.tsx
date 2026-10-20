'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { AvatarInitials } from '@/components/discipline-data-table';
import { StudentScanPicker, type StudentScanMethod } from '@/components/student-scan-picker';
import { useGateContext } from '@/modules/gateManager/gate-context';
import { formatTime12h, permissionTypeLabel } from '@/modules/permissions/permission-utils';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { GateScanResult } from '@/types/discipline';
import { toast } from 'sonner';

interface GateScannerPanelProps {
  mode?: 'scan' | 'checkout' | 'checkin';
  initialCode?: string;
  onComplete?: () => void;
}

function formatRecordedTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function GateScannerPanel({ mode = 'scan', initialCode = '', onComplete }: GateScannerPanelProps) {
  const { selectedGate, selectedOfficer } = useGateContext();
  const lastMethod = useRef<StudentScanMethod>('Manual');
  const [lastCode, setLastCode] = useState(initialCode);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<GateScanResult | null>(null);
  const [acting, setActing] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyAuth, setEmergencyAuth] = useState('');
  const [emergencyPin, setEmergencyPin] = useState('');

  const lookup = useCallback(async (value: string, method: StudentScanMethod = lastMethod.current) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    lastMethod.current = method;
    setLastCode(trimmed);
    setScanning(true);
    try {
      const { data } = await disciplineApi.gateScan(trimmed);
      setResult(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Scan failed'));
      setResult(null);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) void lookup(initialCode, 'Manual');
  }, [initialCode, lookup]);

  async function confirmCheckout() {
    if (!result?.permission || !selectedGate) {
      toast.error('Select a gate first');
      return;
    }
    setActing(true);
    try {
      const { data } = await disciplineApi.gateCheckout(result.permission.id, {
        gateId: selectedGate.id,
        method: lastMethod.current,
        officerId: selectedOfficer?.id,
        officerName: selectedOfficer?.fullName,
      });
      toast.success(
        `${data.data.varianceLabel ?? 'Student checked out'} · ${formatRecordedTime(new Date().toISOString())}`
      );
      await lookup(lastCode, lastMethod.current);
      onComplete?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Check-out failed'));
    } finally {
      setActing(false);
    }
  }

  async function confirmCheckin() {
    if (!result?.permission || !selectedGate) {
      toast.error('Select a gate first');
      return;
    }
    setActing(true);
    try {
      const { data } = await disciplineApi.gateCheckin(result.permission.id, {
        gateId: selectedGate.id,
        method: lastMethod.current,
        officerId: selectedOfficer?.id,
        officerName: selectedOfficer?.fullName,
      });
      const overdueNote = result.permission.isOverdue ? ' (was overdue)' : '';
      toast.success(
        `${data.data.varianceLabel ?? 'Student returned'}${overdueNote} · ${formatRecordedTime(new Date().toISOString())}`
      );
      await lookup(lastCode, lastMethod.current);
      onComplete?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Check-in failed'));
    } finally {
      setActing(false);
    }
  }

  async function submitEmergency() {
    if (!result?.permission || !selectedGate) return;
    if (!emergencyReason.trim() || !emergencyAuth.trim()) {
      toast.error('Reason and authorizer are required');
      return;
    }
    setActing(true);
    try {
      await disciplineApi.gateEmergencyExit({
        studentId: result.permission.studentId,
        studentName: result.permission.studentName,
        studentCode: result.permission.studentCode ?? undefined,
        className: result.permission.className,
        gateId: selectedGate.id,
        reason: emergencyReason.trim(),
        authorizedBy: emergencyAuth.trim(),
        officerId: selectedOfficer?.id,
        officerName: selectedOfficer?.fullName,
        pin: emergencyPin || undefined,
      });
      toast.success('Emergency exit recorded');
      setShowEmergency(false);
      setEmergencyReason('');
      setEmergencyAuth('');
      setEmergencyPin('');
      await lookup(lastCode, lastMethod.current);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Emergency exit failed'));
    } finally {
      setActing(false);
    }
  }

  const permission = result?.permission;
  const isOutside = Boolean(permission?.isCurrentlyOut);
  const isCompleted = permission?.status === 'Completed';
  const canCheckout =
    permission &&
    !isOutside &&
    !isCompleted &&
    result.suggestedAction === 'checkout' &&
    result.exitValidation.allowed &&
    (mode === 'scan' || mode === 'checkout');

  const canCheckin =
    permission &&
    isOutside &&
    !isCompleted &&
    result.suggestedAction === 'checkin' &&
    (mode === 'scan' || mode === 'checkin');

  const scanTitle =
    mode === 'checkout'
      ? 'Check-Out — Scan Permission / Student'
      : mode === 'checkin'
        ? 'Check-In — Scan Returning Student'
        : 'Scan Permission / Student';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="hr-card p-5">
          <p className="mb-3 text-sm font-semibold text-[#000435]">{scanTitle}</p>
          <StudentScanPicker
            disabled={scanning}
            placeholder="Student code, permission ref (PR-2026-002), PRC-…"
            onCodeResolved={(code, method) => void lookup(code, method)}
          />
          {scanning ? <p className="mt-2 text-center text-xs text-slate-500">Verifying permission…</p> : null}
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700"
          onClick={() => setShowEmergency((v) => !v)}
        >
          <ShieldAlert size={18} /> Emergency Exit Override
        </button>

        {showEmergency && permission ? (
          <div className="hr-card space-y-3 p-5">
            <p className="text-sm font-semibold text-red-700">Emergency exit — fully audited</p>
            <input className="discipline-input" placeholder="Reason (medical emergency…)" value={emergencyReason} onChange={(e) => setEmergencyReason(e.target.value)} />
            <input className="discipline-input" placeholder="Authorized by (Head Teacher)" value={emergencyAuth} onChange={(e) => setEmergencyAuth(e.target.value)} />
            <input className="discipline-input" type="password" placeholder="Override PIN (if required)" value={emergencyPin} onChange={(e) => setEmergencyPin(e.target.value)} />
            <button type="button" className="btn-primary w-full bg-red-600 hover:bg-red-700" disabled={acting} onClick={() => void submitEmergency()}>
              Record Emergency Exit
            </button>
          </div>
        ) : null}
      </div>

      <div className="hr-card p-5">
        {!permission ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-slate-500">
            <LogOut size={40} className="mb-3 text-slate-300" />
            Scan a student Smart Card QR, permission QR, or enter a student / permission code.
          </div>
        ) : (
          <div className="space-y-4">
            {isCompleted ? (
              <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-slate-700">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Permission completed</p>
                  <p className="text-xs">Student returned at {formatRecordedTime(permission.actualReturnAt)}</p>
                </div>
              </div>
            ) : null}

            {isOutside && !isCompleted ? (
              <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
                <LogOut size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Already outside campus</p>
                  <p className="text-xs">
                    Checked out at {formatRecordedTime(permission.actualDepartureAt)}.
                    {mode === 'checkout' ? ' Use Check-In / Returns to record return.' : ' Ready to record return.'}
                  </p>
                </div>
              </div>
            ) : null}

            {canCheckout ? (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Permission verified — exit allowed</p>
                  <p className="text-xs">Student may leave school for today&apos;s approved permission.</p>
                </div>
              </div>
            ) : null}

            {!canCheckout && !canCheckin && !isCompleted && result?.suggestedAction === 'denied' ? (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-red-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{isOutside && mode === 'checkout' ? 'Already outside' : 'Action not allowed'}</p>
                  <p className="text-xs">{result.exitValidation.reason ?? 'Cannot proceed with this permission.'}</p>
                </div>
              </div>
            ) : null}

            {!isOutside && !isCompleted && mode === 'checkin' && permission ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Student has not left yet</p>
                  <p className="text-xs">Use Check-Out first to allow exit, then Check-In when they return.</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3">
              <AvatarInitials name={permission.studentName} seed={permission.studentId} />
              <div>
                <p className="text-lg font-bold text-[#000435]">{permission.studentName}</p>
                <p className="font-mono text-sm text-slate-500">{permission.studentCode}</p>
                <p className="text-sm text-slate-600">{permission.className}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-xs uppercase text-slate-400">Permission</p>
              <p className="font-semibold">{permission.referenceNumber} · {permissionTypeLabel(permission)}</p>
              {permission.scanCode ? (
                <p className="mt-1 font-mono text-xs font-semibold text-[#fcb038]">{permission.scanCode}</p>
              ) : null}
              <p className="mt-1 text-slate-600">{permission.reason}</p>
              {permission.destination ? (
                <p className="mt-2 text-xs text-slate-500">Going to: {permission.destination}</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Expected Departure</span>
                  <p className="font-medium">{formatTime12h(permission.departureTime)}</p>
                  {permission.actualDepartureAt ? (
                    <p className="text-emerald-700">Left: {formatRecordedTime(permission.actualDepartureAt)}</p>
                  ) : null}
                </div>
                <div>
                  <span className="text-slate-400">Expected Return</span>
                  <p className="font-medium">{formatTime12h(permission.expectedReturnTime)}</p>
                  {permission.actualReturnAt ? (
                    <p className="text-emerald-700">Returned: {formatRecordedTime(permission.actualReturnAt)}</p>
                  ) : null}
                </div>
              </div>
              {permission.isOverdue && isOutside ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  <Clock size={14} />
                  OVERDUE — {permission.overdueMinutes ?? 0} min past expected return ({formatTime12h(permission.expectedReturnTime)})
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Security checks</p>
              {result?.exitValidation.checks.map((c) => (
                <div key={c.key} className={`flex items-center gap-2 text-xs ${c.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                  {c.passed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {c.message}
                </div>
              ))}
            </div>

            {canCheckout ? (
              <button
                type="button"
                className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
                disabled={acting}
                onClick={() => void confirmCheckout()}
              >
                <LogOut size={18} />
                Agree — Allow Exit from School
              </button>
            ) : null}

            {canCheckin ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                disabled={acting}
                onClick={() => void confirmCheckin()}
              >
                <LogIn size={18} />
                Agree — Record Entry to School
                {permission.isOverdue ? ` (${permission.overdueMinutes ?? 0} min overdue)` : ''}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

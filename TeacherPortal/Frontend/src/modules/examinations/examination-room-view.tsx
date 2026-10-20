'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, QrCode } from 'lucide-react';
import { QrScannerModal } from '@/modules/teaching/classroom-qr/qr-scanner-modal';
import {
  examInvigilatorApiDetails,
  examInvigilatorApiError,
  fetchExamRoom,
  markExamEntry,
  markExamExit,
  type ExamBlockDetails,
  type InvigilatorRoom,
  type InvigilatorStudent,
} from '@/services/exam-invigilator-api';

function parseCode(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return (parts[3] || parts[parts.length - 1] || trimmed).trim();
  }
  return trimmed;
}

function money(n?: number | null) {
  return `${Number(n || 0).toLocaleString()} RWF`;
}

function allowedOf(s: InvigilatorStudent) {
  return s.examAllowed !== false;
}

export function ExaminationRoomView({
  roomName,
  sessionId,
  examDate,
  slotCode,
}: {
  roomName: string;
  sessionId?: string;
  examDate?: string;
  slotCode?: string;
}) {
  const [room, setRoom] = useState<InvigilatorRoom | null>(null);
  const [students, setStudents] = useState<InvigilatorStudent[]>([]);
  const [mode, setMode] = useState<'entry' | 'exit'>('entry');
  const [scanOpen, setScanOpen] = useState(false);
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState<ExamBlockDetails | null>(null);
  const [confirmed, setConfirmed] = useState<{
    name: string;
    code: string;
    className: string;
    time: string;
    status?: string;
    reason?: string | null;
    balance?: number;
    financialStatus?: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const data = await fetchExamRoom({ roomName, sessionId, examDate, slotCode });
    setRoom(data.room);
    setStudents(data.students);
  }, [roomName, sessionId, examDate, slotCode]);

  useEffect(() => {
    reload().catch((e) => setError(examInvigilatorApiError(e, 'Could not load this exam room')));
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q));
  }, [students, query]);

  const kpis = {
    total: students.length,
    allowed: students.filter(allowedOf).length,
    blocked: students.filter((s) => !allowedOf(s)).length,
    present: students.filter((s) => s.checkInAt).length,
    exited: students.filter((s) => s.exitAt).length,
  };

  async function record(raw: string, method: 'MANUAL' | 'QR') {
    if (!raw.trim()) return;
    setBusy(true); setError(''); setInfo(''); setBlock(null); setConfirmed(null);
    try {
      const body = {
        roomName,
        sessionId: room?.sessionId || sessionId,
        examDate: room?.examDate || examDate,
        slotCode: room?.slotCode || slotCode,
        studentCode: parseCode(raw),
        method,
      };
      if (mode === 'entry') {
        const result = await markExamEntry(body);
        const att = result.attendance as { fullName?: string; checkInAt?: string | null; studentCode?: string } | undefined;
        const match = students.find((s) => s.studentCode === parseCode(raw) || s.studentId === parseCode(raw));
        setConfirmed({
          name: att?.fullName || match?.fullName || 'Student',
          code: att?.studentCode || match?.studentCode || parseCode(raw),
          className: match?.className || room?.classNames.join(', ') || '',
          time: att?.checkInAt ? new Date(att.checkInAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
          status: result.eligibility?.status,
          reason: result.eligibility?.reason,
          balance: result.eligibility?.balance,
          financialStatus: result.eligibility?.financialStatus,
        });
        setInfo(result.already ? (result.message || 'Already marked present') : 'Examination attendance recorded');
      } else {
        await markExamExit(body);
        setInfo('Exit recorded');
      }
      setCode('');
      await reload();
    } catch (e) {
      const details = examInvigilatorApiDetails(e);
      if (details?.code === 'EXAM_NOT_ALLOWED') {
        setBlock(details);
      } else {
        setError(examInvigilatorApiError(e, 'Could not record attendance'));
      }
    } finally {
      setBusy(false);
      setScanOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/examinations" className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
          <ArrowLeft className="h-4 w-4" /> All rooms
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-navy">{room?.roomName || roomName}</h1>
        <p className="mt-1 text-sm text-muted">
          {room?.classNames.join(', ')} · {room?.subjectName || room?.sessionName}
        </p>
        <p className="text-sm text-muted">
          {room?.examDate} · {room?.startTime}–{room?.endTime}
        </p>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {block ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
          <p className="font-extrabold">⚠ EXAMINATION ACCESS NOT AUTHORIZED</p>
          <p className="mt-2 font-semibold">{block.studentName}</p>
          <p>{block.studentCode} · {block.className}</p>
          <p className="mt-3 font-bold">Outstanding Balance</p>
          <p>{money(block.balance)}</p>
          <p className="mt-3 font-bold">Examination Status</p>
          <p>🔴 NOT ALLOWED</p>
          <p className="mt-3">{block.message || 'Please contact the school office.'}</p>
          <p className="mt-2 text-xs">Teachers cannot override this. Ask the school office to update and republish the examination list.</p>
        </div>
      ) : null}

      {confirmed ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
          <p className="font-extrabold">✓ EXAMINATION ELIGIBILITY CONFIRMED</p>
          <p className="mt-2 font-semibold">{confirmed.name}</p>
          <p>{confirmed.code} · {confirmed.className}</p>
          <p className="mt-2">Examination: {room?.subjectName}</p>
          <p>Room: {room?.roomName}</p>
          {confirmed.financialStatus === 'NOT_CLEARED' || confirmed.status === 'MANUALLY_ALLOWED' ? (
            <div className="mt-3 rounded-xl bg-white/70 p-3">
              <p>Financial Status: 🔴 Balance Remaining {confirmed.balance != null ? money(confirmed.balance) : ''}</p>
              <p>Examination Status: 🟠 MANUALLY APPROVED</p>
              {confirmed.reason ? <p>Reason: {confirmed.reason}</p> : null}
            </div>
          ) : null}
          <p className="mt-3 font-bold">🟢 ALLOWED TO SIT EXAM</p>
          <p>Attendance recorded: {confirmed.time}</p>
        </div>
      ) : info ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{info}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={kpis.total} />
        <Stat label="Allowed" value={kpis.allowed} tone="text-emerald-700" />
        <Stat label="Not Allowed" value={kpis.blocked} tone="text-rose-700" />
        <Stat label="Present" value={kpis.present} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('entry')} className={mode === 'entry' ? 'btn-primary' : 'btn-secondary'}>
          Entry
        </button>
        <button type="button" onClick={() => setMode('exit')} className={mode === 'exit' ? 'btn-primary' : 'btn-secondary'}>
          Exit
        </button>
        <button type="button" onClick={() => setScanOpen(true)} className="btn-secondary inline-flex items-center gap-2">
          <QrCode className="h-4 w-4" /> QR scan
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"
          placeholder={mode === 'entry' ? 'Student code or QR payload' : 'Student code to record exit'}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void record(code, 'MANUAL'); }}
        />
        <button type="button" disabled={busy} onClick={() => void record(code, 'MANUAL')} className="btn-primary">
          {mode === 'entry' ? 'Record entry' : 'Record exit'}
        </button>
      </div>

      <input
        className="w-full max-w-sm rounded-xl border border-border px-3 py-2 text-sm"
        placeholder="Filter students"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {filtered.map((s) => {
          const allowed = allowedOf(s);
          return (
            <div key={s.studentId} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
              <div>
                <p className="font-semibold text-navy">{s.fullName}</p>
                <p className="text-xs text-muted">{s.studentCode} · {s.className} · Seat {s.seatCode || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  s.examDecision === 'MANUALLY_ALLOWED' ? 'bg-amber-50 text-amber-800'
                    : allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {s.examDecision === 'MANUALLY_ALLOWED' ? '🟠 Allowed' : allowed ? '🟢 Allowed' : '🔴 Not allowed'}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.exitAt ? 'bg-slate-100 text-slate-700' : s.checkInAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  {s.exitAt ? 'Exited' : s.checkInAt ? 'In hall' : 'Not arrived'}
                </span>
                {mode === 'entry' ? (
                  s.checkInAt ? (
                    <span className="text-xs text-muted">{new Date(s.checkInAt).toLocaleTimeString()}</span>
                  ) : allowed ? (
                    <button type="button" disabled={busy} className="text-sm font-semibold text-navy" onClick={() => void record(s.studentCode, 'MANUAL')}>
                      Mark present
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-rose-700">Blocked</span>
                  )
                ) : s.exitAt ? (
                  <span className="text-xs text-muted">{new Date(s.exitAt).toLocaleTimeString()}</span>
                ) : (
                  <button type="button" disabled={busy || !s.checkInAt} className="text-sm font-semibold text-navy disabled:opacity-40" onClick={() => void record(s.studentCode, 'MANUAL')}>
                    Mark exit
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length ? <p className="px-4 py-8 text-center text-sm text-muted">No students seated in this room yet. Generate seating in Academic first.</p> : null}
      </div>

      {scanOpen ? (
        <QrScannerModal
          onScan={(value) => void record(value, 'QR')}
          onClose={() => setScanOpen(false)}
          onManual={() => setScanOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-navy">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone || 'text-navy'}`}>{value}</p>
    </div>
  );
}

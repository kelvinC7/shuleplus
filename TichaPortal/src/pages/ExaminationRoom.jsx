import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import QrScanModal from '../components/QrScanModal';
import TeacherPageShell, { tpActionBtn, tpActionBtnPrimary } from '../components/TeacherPageShell';
import {
  fetchExamRoom,
  markExamEntry,
  markExamExit,
  tpApiDetails,
  tpApiError,
} from '../services/teacherPortalApi';

function parseCode(raw) {
  const trimmed = String(raw || '').trim();
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return (parts[3] || parts[parts.length - 1] || trimmed).trim();
  }
  return trimmed;
}

function allowedOf(s) {
  return s.examAllowed !== false;
}

export default function ExaminationRoom() {
  const { roomName: encodedRoom } = useParams();
  const [searchParams] = useSearchParams();
  const roomName = decodeURIComponent(encodedRoom || '');
  const sessionId = searchParams.get('sessionId') || undefined;
  const examDate = searchParams.get('examDate') || undefined;
  const slotCode = searchParams.get('slotCode') || undefined;

  const [room, setRoom] = useState(null);
  const [students, setStudents] = useState([]);
  const [mode, setMode] = useState('entry');
  const [scanOpen, setScanOpen] = useState(false);
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const data = await fetchExamRoom({ roomName, sessionId, examDate, slotCode });
    setRoom(data.room);
    setStudents(data.students || []);
  }, [roomName, sessionId, examDate, slotCode]);

  useEffect(() => {
    reload().catch((e) => setError(tpApiError(e, 'Could not load this exam room')));
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.fullName?.toLowerCase().includes(q) || s.studentCode?.toLowerCase().includes(q));
  }, [students, query]);

  const kpis = {
    total: students.length,
    allowed: students.filter(allowedOf).length,
    blocked: students.filter((s) => !allowedOf(s)).length,
    present: students.filter((s) => s.checkInAt).length,
    exited: students.filter((s) => s.exitAt).length,
  };

  async function record(raw, method) {
    if (!String(raw || '').trim()) return;
    setBusy(true);
    setError('');
    setInfo('');
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
        setInfo(result.already ? result.message || 'Already marked present' : 'Examination attendance recorded');
      } else {
        await markExamExit(body);
        setInfo('Exit recorded');
      }
      setCode('');
      await reload();
    } catch (e) {
      const details = tpApiDetails(e);
      setError(details?.message || tpApiError(e, 'Could not record attendance'));
    } finally {
      setBusy(false);
      setScanOpen(false);
    }
  }

  const subtitle = [
    (room?.classNames || []).join(', '),
    room?.subjectName || room?.sessionName,
    room?.examDate && `${room.examDate} · ${room?.startTime || ''}–${room?.endTime || ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const shellStats = [
    { label: 'Total', value: kpis.total },
    { label: 'Allowed', value: kpis.allowed },
    { label: 'Blocked', value: kpis.blocked },
    { label: 'Present', value: kpis.present },
    { label: 'Exited', value: kpis.exited },
  ];

  const shellActions = (
    <Link to="/examinations" className={`${tpActionBtn} w-full sm:w-auto`}>
      <ArrowLeft className="h-4 w-4" /> All rooms
    </Link>
  );

  return (
    <TeacherPageShell
      title="Examinations"
      subtitle={[room?.roomName || roomName, subtitle].filter(Boolean).join(' · ') || 'Examination room'}
      stats={shellStats}
      actions={shellActions}
    >
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {info && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{info}</div>}

      <div className="tp-card p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {['entry', 'exit'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${
                mode === m ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="tp-input flex-1"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Student code"
            onKeyDown={(e) => e.key === 'Enter' && void record(code, 'MANUAL')}
          />
          <button type="button" className={`${tpActionBtnPrimary} w-full sm:w-auto`} disabled={busy} onClick={() => void record(code, 'MANUAL')}>
            Record {mode}
          </button>
          <button type="button" className={`${tpActionBtn} w-full sm:w-auto`} onClick={() => setScanOpen(true)}>
            <QrCode className="h-4 w-4" /> Scan
          </button>
        </div>
        <input
          className="tp-input mt-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roster…"
        />
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Student</th>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Seat</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.studentId} className="border-b border-slate-50">
                  <td className="px-2 py-2 text-[#000435]">{s.fullName}</td>
                  <td className="px-2 py-2 text-slate-500">{s.studentCode}</td>
                  <td className="px-2 py-2 text-slate-500">{s.seatCode || '-'}</td>
                  <td className="px-2 py-2">
                    {s.checkInAt ? 'Present' : allowedOf(s) ? 'Allowed' : 'Not allowed'}
                    {s.exitAt ? ' · exited' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {scanOpen ? (
        <QrScanModal
          title={mode === 'entry' ? 'Scan for entry' : 'Scan for exit'}
          onScan={(raw) => void record(raw, 'QR')}
          onClose={() => setScanOpen(false)}
          onManual={() => setScanOpen(false)}
        />
      ) : null}
    </TeacherPageShell>
  );
}

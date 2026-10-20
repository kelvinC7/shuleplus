import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DoorOpen, ListChecks, ScanLine, Search, X } from 'lucide-react';
import QrScanModal from '../components/QrScanModal';
import TeacherPageShell, { tpActionBtn, tpActionBtnPrimary } from '../components/TeacherPageShell';
import {
  checkExamEligibility,
  fetchExamLists,
  fetchMyExamRooms,
  tpApiError,
} from '../services/teacherPortalApi';

function roomHref(room) {
  const qs = new URLSearchParams({
    sessionId: room.sessionId || '',
    examDate: room.examDate || '',
    slotCode: room.slotCode || '',
  });
  return `/examinations/${encodeURIComponent(room.roomName)}?${qs}`;
}

function roomListKey(room) {
  return `${room.sessionId}|${room.examDate}|${room.slotCode}|${room.roomName}`;
}

function listLabel(student) {
  if (student.examAllowed === false) return { text: 'Not allowed', tone: 'bg-rose-50 text-rose-800' };
  if (student.examDecision === 'NO_LIST') return { text: 'No list', tone: 'bg-amber-50 text-amber-800' };
  return { text: 'Allowed', tone: 'bg-emerald-50 text-emerald-800' };
}

function resultFromStudent(student, room) {
  const noList = student.examDecision === 'NO_LIST';
  return {
    studentCode: student.studentCode,
    published: !noList,
    allowed: student.examAllowed !== false,
    status: student.examDecision || (student.examAllowed === false ? 'NOT_ALLOWED' : 'ALLOWED'),
    studentName: student.fullName,
    className: student.className,
    reason: student.exceptionReason,
    message: noList ? 'No published examination list for this class.' : undefined,
    balance: student.feeBalance ?? undefined,
  };
}

function EligibilityResult({ result, onClose }) {
  const allowed = result.published && result.allowed;
  const noList = !result.published || result.status === 'NO_LIST';
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#000435]/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3 flex justify-between">
          <p className="text-sm font-medium text-[#000435]">Eligibility</p>
          <button type="button" onClick={onClose} className="p-1 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            noList ? 'border-amber-200 bg-amber-50' : allowed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
          }`}
        >
          <p className="font-medium text-[#000435]">{result.studentName || result.studentCode}</p>
          <p className="mt-1 text-slate-600">{noList ? 'No list' : allowed ? 'Allowed' : 'Not allowed'}</p>
          {result.message && <p className="mt-2">{result.message}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Examinations() {
  const [rooms, setRooms] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [listQuery, setListQuery] = useState('');
  const [listRoomKey, setListRoomKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchMyExamRooms();
        if (!cancelled) {
          setRooms(data?.rooms ?? []);
          setError(data?.warning || '');
        }
      } catch (err) {
        if (!cancelled) setError(tpApiError(err, 'Could not load examination rooms'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openManual() {
    setManualOpen(true);
    setListsLoading(true);
    try {
      const data = await fetchExamLists();
      const rows = data?.rooms ?? [];
      setLists(rows);
      if (rows[0]) setListRoomKey(roomListKey(rows[0].room));
    } catch (err) {
      setError(tpApiError(err, 'Could not load exam lists'));
    } finally {
      setListsLoading(false);
    }
  }

  async function checkCode(raw) {
    const studentCode = String(raw || '').trim();
    if (!studentCode) return;
    setChecking(true);
    setError('');
    try {
      setResult(await checkExamEligibility({ studentCode }));
      setCodeOpen(false);
      setScanOpen(false);
      setManualCode('');
    } catch (err) {
      setError(tpApiError(err, 'Could not check list'));
    } finally {
      setChecking(false);
    }
  }

  const selectedList = lists.find((row) => roomListKey(row.room) === listRoomKey) || lists[0];
  const filteredStudents = useMemo(() => {
    const students = selectedList?.students ?? [];
    const q = listQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentCode?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q)
    );
  }, [selectedList, listQuery]);

  const totalStudents = rooms.reduce((s, r) => s + (r.studentCount || 0), 0);

  const subjectCount = new Set(rooms.map((r) => r.subjectName || r.sessionName).filter(Boolean)).size;

  const stats = [
    { label: 'Exam Rooms', value: loading ? '-' : rooms.length },
    { label: 'Students Seated', value: loading ? '-' : totalStudents },
    { label: 'Subjects', value: loading ? '-' : subjectCount },
    { label: 'Room Lists', value: lists.length || '-' },
  ];

  const actions = (
    <>
      <button type="button" className={tpActionBtnPrimary} onClick={() => setScanOpen(true)} disabled={checking}>
        <ScanLine size={16} /> {checking ? 'Checking…' : 'Scan QR'}
      </button>
      <button type="button" className={tpActionBtn} onClick={() => void openManual()}>
        <ListChecks size={16} /> Room lists
      </button>
      <button type="button" className={tpActionBtn} onClick={() => setCodeOpen(true)}>
        Enter code
      </button>
    </>
  );

  return (
    <>
      <TeacherPageShell
        title="Examinations"
        subtitle="Invigilation and examination lists"
        stats={stats}
        actions={actions}
      >
        {error && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              /not running|3003/i.test(error) ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {error}
          </div>
        )}

        {manualOpen && (
          <div className="tp-card overflow-hidden p-0">
            <div className="tp-card-header border-b border-black/[0.06]">
              <h3>Room lists</h3>
              <button type="button" className="ml-auto text-xs text-slate-500" onClick={() => setManualOpen(false)}>
                Close
              </button>
            </div>
            {listsLoading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : !lists.length ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No lists yet.</p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto border-b border-black/[0.06] px-3 py-2">
                  {lists.map((row) => {
                    const key = roomListKey(row.room);
                    const active = key === (selectedList ? roomListKey(selectedList.room) : '');
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setListRoomKey(key)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${active ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {row.room.roomName}
                      </button>
                    );
                  })}
                </div>
                {selectedList && (
                  <>
                    <div className="relative border-b border-black/[0.06] px-3 py-2">
                      <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="tp-input w-full pl-8 py-2"
                        placeholder="Search students"
                        value={listQuery}
                        onChange={(e) => setListQuery(e.target.value)}
                      />
                    </div>
                    <ul className="max-h-[min(420px,50vh)] divide-y divide-black/[0.06] overflow-y-auto">
                      {filteredStudents.map((student) => {
                        const badge = listLabel(student);
                        return (
                          <li key={student.studentId}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() => setResult(resultFromStudent(student, selectedList.room))}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#000435]">{student.fullName}</p>
                                <p className="truncate text-xs text-slate-500">{student.studentCode}</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.tone}`}>
                                {badge.text}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="tp-card overflow-hidden p-0">
          <div className="tp-card-header border-b border-black/[0.06]">
            <h3>Your rooms</h3>
          </div>
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : !rooms.length ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No exam rooms assigned.</p>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {rooms.map((room) => (
                <li key={room.key || roomHref(room)}>
                  <Link to={roomHref(room)} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="font-medium text-[#000435]">{room.roomName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {room.examDate} · {room.subjectName || room.sessionName} · {room.studentCount} students
                      </p>
                    </div>
                    <DoorOpen size={18} className="shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </TeacherPageShell>

      {scanOpen && (
        <QrScanModal
          title="Scan student QR"
          hint="Check examination list"
          onScan={(code) => void checkCode(code)}
          onClose={() => setScanOpen(false)}
          onManual={() => {
            setScanOpen(false);
            setCodeOpen(true);
          }}
        />
      )}

      {codeOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#000435]/50 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <p className="text-sm font-medium text-[#000435]">Student code</p>
            <input
              className="tp-input mt-2"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void checkCode(manualCode)}
            />
            <div className="mt-3 flex gap-2">
              <button type="button" className={`${tpActionBtn} flex-1`} onClick={() => setCodeOpen(false)}>
                Cancel
              </button>
              <button type="button" className={`${tpActionBtnPrimary} flex-1`} onClick={() => void checkCode(manualCode)}>
                Check
              </button>
            </div>
          </div>
        </div>
      )}

      {result && <EligibilityResult result={result} onClose={() => setResult(null)} />}
    </>
  );
}

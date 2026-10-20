'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, DoorOpen, ListChecks, ScanLine, Search, X } from 'lucide-react';
import { QrScannerModal } from '@/modules/teaching/classroom-qr/qr-scanner-modal';
import {
  checkExamEligibility,
  examInvigilatorApiError,
  fetchExamLists,
  fetchMyExamRooms,
  type ExamEligibilityCheck,
  type ExamRoomList,
  type InvigilatorRoom,
  type InvigilatorStudent,
} from '@/services/exam-invigilator-api';

function roomHref(room: InvigilatorRoom) {
  const qs = new URLSearchParams({
    sessionId: room.sessionId,
    examDate: room.examDate,
    slotCode: room.slotCode,
  });
  return `/examinations/${encodeURIComponent(room.roomName)}?${qs}`;
}

function roomListKey(room: InvigilatorRoom) {
  return `${room.sessionId}|${room.examDate}|${room.slotCode}|${room.roomName}`;
}

function listLabel(student: InvigilatorStudent) {
  if (student.examAllowed === false) return { text: 'Not allowed', tone: 'bg-rose-50 text-rose-800' };
  if (student.examDecision === 'MANUALLY_ALLOWED') return { text: 'Manually approved', tone: 'bg-amber-50 text-amber-800' };
  if (student.examDecision === 'NO_LIST') return { text: 'No published list', tone: 'bg-amber-50 text-amber-800' };
  return { text: 'Allowed', tone: 'bg-emerald-50 text-emerald-800' };
}

function resultFromStudent(student: InvigilatorStudent, room: InvigilatorRoom): ExamEligibilityCheck {
  const noList = student.examDecision === 'NO_LIST';
  return {
    studentCode: student.studentCode,
    published: !noList,
    allowed: student.examAllowed !== false,
    status: student.examDecision || (student.examAllowed === false ? 'NOT_ALLOWED' : 'ALLOWED'),
    studentName: student.fullName,
    className: student.className,
    examName: room.subjectName || room.sessionName,
    roomName: student.roomName || room.roomName,
    subjectName: room.subjectName,
    academicYear: room.academicYear,
    term: room.term,
    financialStatus: student.financialStatus || undefined,
    balance: student.feeBalance ?? undefined,
    reason: student.exceptionReason,
    message: noList ? 'School Fees has not published an examination list for this class yet.' : undefined,
  };
}

function EligibilityResult({ result, onClose }: { result: ExamEligibilityCheck; onClose: () => void }) {
  const allowed = result.published && result.allowed;
  const noList = !result.published || result.status === 'NO_LIST';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Examination list</p>
          <button type="button" className="rounded-lg p-1 hover:bg-slate-100" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 ${
            noList
              ? 'border-amber-200 bg-amber-50'
              : allowed
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
          }`}
        >
          <p
            className={`text-lg font-extrabold ${
              noList ? 'text-amber-800' : allowed ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {noList ? 'No published list' : allowed ? 'ALLOWED TO SIT EXAM' : 'NOT ALLOWED TO SIT EXAM'}
          </p>
          {result.studentName ? <p className="mt-1 font-bold text-navy">{result.studentName}</p> : null}
          <p className="text-sm text-muted">
            {[result.studentCode, result.className, result.roomName, result.examName || result.subjectName]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {result.balance != null && !allowed && !noList ? (
            <p className="mt-2 text-sm font-semibold text-rose-800">
              Outstanding balance {Number(result.balance).toLocaleString()} RWF
            </p>
          ) : null}
          {result.reason ? <p className="mt-1 text-sm text-navy">{result.reason}</p> : null}
          {result.message && noList ? <p className="mt-2 text-sm text-amber-800">{result.message}</p> : null}
        </div>
        <button type="button" className="btn-primary mt-4 w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export function ExaminationsView() {
  const [rooms, setRooms] = useState<InvigilatorRoom[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ExamEligibilityCheck | null>(null);
  const [lists, setLists] = useState<ExamRoomList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listRoomKey, setListRoomKey] = useState('');
  const [listQuery, setListQuery] = useState('');

  useEffect(() => {
    fetchMyExamRooms()
      .then((data) => {
        setRooms(data.rooms);
        setName(data.actor.name);
      })
      .catch((e) => setError(examInvigilatorApiError(e, 'Could not load assigned examination rooms')))
      .finally(() => setLoading(false));
  }, []);

  const selectedList = lists.find((row) => roomListKey(row.room) === listRoomKey) ?? lists[0] ?? null;
  const filteredStudents = useMemo(() => {
    if (!selectedList) return [];
    const q = listQuery.trim().toLowerCase();
    if (!q) return selectedList.students;
    return selectedList.students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q) || s.className.toLowerCase().includes(q),
    );
  }, [selectedList, listQuery]);

  async function openManual() {
    setManualOpen(true);
    setCodeOpen(false);
    if (lists.length) return;
    setListsLoading(true);
    setError('');
    try {
      const data = await fetchExamLists();
      setLists(data.rooms);
      setListRoomKey(data.rooms[0] ? roomListKey(data.rooms[0].room) : '');
    } catch (e) {
      setError(examInvigilatorApiError(e, 'Could not load your allocated examination lists'));
    } finally {
      setListsLoading(false);
    }
  }

  async function checkCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    setChecking(true);
    setScanOpen(false);
    setCodeOpen(false);
    setError('');
    try {
      const room = selectedList?.room || rooms[0];
      const data = await checkExamEligibility({
        studentCode: code,
        academicYear: room?.academicYear,
        term: room?.term,
      });
      setResult(data);
    } catch (e) {
      setError(examInvigilatorApiError(e, 'Could not check examination list'));
    } finally {
      setChecking(false);
      setManualCode('');
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted">Loading examination rooms…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Examinations</h1>
        <p className="mt-1 text-sm text-muted">
          {name || 'Invigilator'} — only rooms allocated to you from Academic examination planning. Check the published School Fees list, then mark entry and exit.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-sm font-bold text-navy">Scan student QR</p>
        <p className="mt-1 text-sm text-muted">
          Scan the Super Admin student QR. Only students seated in your allocated rooms are accepted, and Allowed / Not Allowed comes from the published examination list.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setScanOpen(true)} disabled={checking}>
            <ScanLine size={16} /> {checking ? 'Checking…' : 'Scan student QR'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void openManual()}>
            <ListChecks size={16} /> Manual
          </button>
        </div>
      </div>

      {manualOpen ? (
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-navy">Manual — your allocated rooms</p>
              <p className="mt-1 text-sm text-muted">
                Student lists for rooms assigned to you, with the published Academic / School Fees examination list.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setCodeOpen(true)}>
              Enter code
            </button>
          </div>

          {listsLoading ? (
            <p className="mt-4 text-sm text-muted">Loading allocated room lists…</p>
          ) : !lists.length ? (
            <p className="mt-4 text-sm text-muted">No allocated examination rooms with seating yet.</p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {lists.map((row) => {
                  const key = roomListKey(row.room);
                  const active = key === (selectedList ? roomListKey(selectedList.room) : '');
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setListRoomKey(key)}
                      className={`rounded-full border px-3 py-1.5 text-left text-xs font-semibold ${
                        active ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted'
                      }`}
                    >
                      <span className="block">{row.room.roomName}</span>
                      <span className="block font-normal">
                        {row.students.length} students · {row.allowed} allowed · {row.blocked} not allowed
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedList ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-navy">
                    {selectedList.room.roomName} · {selectedList.room.subjectName || selectedList.room.sessionName} · {selectedList.room.classNames.join(', ')}
                  </p>
                  <p className="text-xs text-muted">
                    {selectedList.room.examDate} · {selectedList.room.slotCode} · {selectedList.room.startTime}–{selectedList.room.endTime}
                  </p>
                  <div className="relative mt-3 max-w-md">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm"
                      placeholder="Search student, code, or class"
                      value={listQuery}
                      onChange={(e) => setListQuery(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                    {filteredStudents.map((student) => {
                      const badge = listLabel(student);
                      return (
                        <button
                          key={student.studentId}
                          type="button"
                          className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                          onClick={() => setResult(resultFromStudent(student, selectedList.room))}
                        >
                          <div>
                            <p className="font-semibold text-navy">{student.fullName}</p>
                            <p className="text-xs text-muted">
                              {student.studentCode} · {student.className} · Seat {student.seatCode || '—'}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.tone}`}>{badge.text}</span>
                        </button>
                      );
                    })}
                    {!filteredStudents.length ? (
                      <p className="px-4 py-8 text-center text-sm text-muted">No students in this allocated room match the search.</p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {!rooms.length ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-navy/40" />
          <p className="mt-3 font-semibold text-navy">No assigned exam rooms</p>
          <p className="mt-1 text-sm text-muted">
            When Academic publishes an examination and assigns you as invigilator, those rooms appear here with the student list.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <Link
              key={room.key}
              href={roomHref(room)}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-navy">{room.roomName}</p>
                  <p className="text-sm text-muted">
                    {room.subjectName || room.sessionName} · {room.classNames.join(', ') || 'Seated students'}
                  </p>
                </div>
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-sm font-medium text-navy">
                {room.examDate} · {room.slotCode} {room.startTime && `· ${room.startTime}–${room.endTime}`}
              </p>
              <p className="mt-1 text-xs text-muted">{room.studentCount} students in this room</p>
            </Link>
          ))}
        </div>
      )}

      {scanOpen ? (
        <QrScannerModal
          title="Scan student QR"
          hint="Align the Super Admin student QR. Only students in your allocated rooms are checked."
          onScan={(code) => void checkCode(code)}
          onClose={() => setScanOpen(false)}
          onManual={() => {
            setScanOpen(false);
            setCodeOpen(true);
          }}
        />
      ) : null}

      {codeOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <p className="text-sm font-bold text-navy">Enter student code</p>
            <p className="mt-1 text-xs text-muted">The student must be seated in one of your allocated rooms.</p>
            <input
              className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="ShuleCode or student code"
              onKeyDown={(e) => e.key === 'Enter' && void checkCode(manualCode)}
            />
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setCodeOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => void checkCode(manualCode)}>
                Check list
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {result ? <EligibilityResult result={result} onClose={() => setResult(null)} /> : null}
    </div>
  );
}

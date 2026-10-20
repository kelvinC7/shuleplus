'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { RollCallClassOption, RollCallTemplate } from '@/types/roll-call';

const QUICK_TEMPLATES = ['Evening Prep', 'Morning Roll Call', 'Assembly', 'Boarding Check', 'Custom'];

export function StartRollCallModal({
  open,
  creating,
  classes,
  templates,
  defaultDate,
  attendanceTypes,
  onClose,
  onSubmit,
}: {
  open: boolean;
  creating: boolean;
  classes: RollCallClassOption[];
  templates: RollCallTemplate[];
  defaultDate: string;
  attendanceTypes: { value: string; label: string }[];
  onClose: () => void;
  onSubmit: (body: {
    name: string;
    classId: string;
    className: string;
    classLabel?: string;
    sessionDate: string;
    startTime?: string;
    attendanceType?: string;
    repeatRule?: string;
  }) => void;
}) {
  const [name, setName] = useState('Evening Prep');
  const [classId, setClassId] = useState('');
  const [sessionDate, setSessionDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('19:00');
  const [attendanceType, setAttendanceType] = useState('general');
  const [repeatRule, setRepeatRule] = useState('ONCE');
  const [classSearch, setClassSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSessionDate(defaultDate);
      setClassId('');
      setClassSearch('');
    }
  }, [open, defaultDate]);

  const selectedClass = classes.find((c) => c.id === classId);
  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.label.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [classes, classSearch]);

  function applyTemplate(t: string) {
    if (t === 'Custom') {
      setName('');
      return;
    }
    setName(t);
    const org = templates.find((x) => x.name === t);
    if (org?.defaultTime) setStartTime(org.defaultTime);
    if (org?.attendanceType) setAttendanceType(org.attendanceType);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Start Round Roll Call</h2>
            <p className="text-sm text-muted">Create an attendance session</p>
          </div>
          <button type="button" className="rounded-lg p-1 text-muted hover:bg-slate-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Roll Call Name *</label>
            <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Evening Prep" />
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-semibold text-navy hover:border-primary"
                  onClick={() => applyTemplate(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Class *</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input w-full !py-2 pl-9"
                placeholder="Search class…"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border">
              {filteredClasses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                    classId === c.id ? 'bg-primary/10 font-semibold text-navy' : ''
                  }`}
                  onClick={() => setClassId(c.id)}
                >
                  <span>{c.label}{c.grade?.name ? ` · ${c.grade.name}` : ''}</span>
                  <span className="text-xs text-muted">{c.studentCount} students</span>
                </button>
              ))}
              {!filteredClasses.length && (
                <p className="p-4 text-center text-xs text-muted">No classes in Student Management</p>
              )}
            </div>
            {selectedClass && (
              <p className="mt-2 text-sm text-emerald-800">
                {selectedClass.label} · {selectedClass.studentCount} students will be loaded automatically
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Date *</label>
              <input type="date" className="input mt-1 w-full" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Start Time</label>
              <input type="time" className="input mt-1 w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Attendance Type</label>
            <select className="input mt-1 w-full" value={attendanceType} onChange={(e) => setAttendanceType(e.target.value)}>
              {attendanceTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Repeat</label>
            <select className="input mt-1 w-full" value={repeatRule} onChange={(e) => setRepeatRule(e.target.value)}>
              <option value="ONCE">Once</option>
              <option value="EVERY_SCHOOL_DAY">Every school day</option>
              <option value="EVERY_MONDAY">Every Monday</option>
              <option value="EVERY_WEEK">Every week</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            disabled={creating || !name.trim() || !classId || !sessionDate}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                classId,
                className: selectedClass!.label,
                classLabel: selectedClass!.label,
                sessionDate,
                startTime,
                attendanceType,
                repeatRule,
              })
            }
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start Roll Call
          </button>
        </div>
      </div>
    </div>
  );
}

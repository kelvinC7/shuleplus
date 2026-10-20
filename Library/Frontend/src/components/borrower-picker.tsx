'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, User, X } from 'lucide-react';
import { libApi } from '@/services/lib-api';
import { FormField } from '@/components/lib-modal';

export type BorrowerSelection = {
  id: string;
  name: string;
  type: 'STUDENT' | 'TEACHER';
  className?: string;
  code?: string;
};

type BorrowerPickerProps = {
  borrowerType: 'STUDENT' | 'TEACHER';
  onTypeChange: (type: 'STUDENT' | 'TEACHER') => void;
  value: BorrowerSelection | null;
  onChange: (borrower: BorrowerSelection | null) => void;
  disabled?: boolean;
};

type StudentResult = {
  id: string;
  fullName: string;
  studentCode: string;
  className: string | null;
};

type TeacherResult = {
  id: string;
  name: string;
  department: string | null;
};

export function BorrowerPicker({ borrowerType, onTypeChange, value, onChange, disabled }: BorrowerPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(StudentResult | TeacherResult)[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string, type: 'STUDENT' | 'TEACHER') => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      if (type === 'STUDENT') {
        const data = await libApi.searchStudents(q);
        setResults(data.students ?? []);
      } else {
        const data = await libApi.searchTeachers(q);
        setResults(data.teachers ?? []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query, borrowerType), 300);
    return () => clearTimeout(t);
  }, [query, borrowerType, search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selectStudent = (s: StudentResult) => {
    onChange({
      id: s.id,
      name: s.fullName,
      type: 'STUDENT',
      className: s.className ?? undefined,
      code: s.studentCode,
    });
    setQuery('');
    setOpen(false);
  };

  const selectTeacher = (t: TeacherResult) => {
    onChange({
      id: t.id,
      name: t.name,
      type: 'TEACHER',
      className: t.department ?? undefined,
    });
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <FormField label="Borrower Type" required>
        <select
          className="input"
          value={borrowerType}
          disabled={disabled}
          onChange={(e) => {
            onTypeChange(e.target.value as 'STUDENT' | 'TEACHER');
            onChange(null);
            setQuery('');
            setResults([]);
          }}
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </FormField>

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-slate-50/80 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
            <User size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-navy">{value.name}</p>
            <p className="text-xs text-muted">
              {[value.code, value.className, value.type].filter(Boolean).join(' · ')}
            </p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-navy">
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div ref={wrapRef} className="relative">
          <FormField label={borrowerType === 'STUDENT' ? 'Search Student' : 'Search Teacher'} required>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder={borrowerType === 'STUDENT' ? 'Name, student code, or SDMS…' : 'Teacher name or ID…'}
                value={query}
                disabled={disabled}
                onFocus={() => setOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              />
              {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
          </FormField>

          {open && query.length >= 2 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border/60 bg-white shadow-lg">
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">No {borrowerType === 'STUDENT' ? 'students' : 'teachers'} found</p>
              ) : borrowerType === 'STUDENT' ? (
                (results as StudentResult[]).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectStudent(s)}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-xs font-bold text-navy">
                      {s.fullName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{s.fullName}</p>
                      <p className="text-xs text-muted">{[s.studentCode, s.className].filter(Boolean).join(' · ')}</p>
                    </div>
                  </button>
                ))
              ) : (
                (results as TeacherResult[]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTeacher(t)}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-xs font-bold text-navy">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{t.name}</p>
                      {t.department && <p className="text-xs text-muted">{t.department}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

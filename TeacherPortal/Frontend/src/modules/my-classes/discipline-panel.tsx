'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import {
  fetchClassDiscipline,
  myClassesApiError,
  type DisciplineCaseRecord,
  type MyClassItem,
} from '@/services/my-classes-api';

function classLabel(cls: MyClassItem) {
  return cls.label || [cls.name, cls.stream].filter(Boolean).join(' ');
}

function severityTone(severity: string) {
  switch (severity.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-amber-100 text-amber-900';
    case 'low':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function DisciplinePanel({
  selectedClass,
  term,
  academicYear,
}: {
  selectedClass: MyClassItem;
  term?: string;
  academicYear?: string;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cases, setCases] = useState<DisciplineCaseRecord[]>([]);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClassDiscipline(selectedClass.id, classLabel(selectedClass), {
        search: search || undefined,
        status: status || undefined,
        term,
        academicYear,
      });
      setCases(result.cases);
      setServiceAvailable(result.serviceAvailable);
    } catch (err) {
      setError(myClassesApiError(err, 'Could not load discipline cases'));
      setCases([]);
      setServiceAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, search, status, term, academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-full flex-col gap-4 p-3 sm:p-4">
      <div className="flex shrink-0 flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or case…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="Under Review">Under Review</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {!serviceAvailable && (
        <div className="shrink-0 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Discipline records are temporarily unavailable</p>
          <p className="mt-1 text-amber-900/80">
            Cases for this class cannot be loaded right now. Please try again in a few minutes or contact your school
            administrator if this continues.
          </p>
        </div>
      )}

      {error && (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading discipline cases…
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
          <ShieldAlert className="mb-2 h-5 w-5 opacity-50" />
          No discipline cases for this class.
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {cases.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.studentName}</p>
                  <p className="text-xs text-slate-500">
                    {c.caseNumber} · {c.category} · {c.incidentDate}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityTone(c.severity)}`}>
                    {c.severity}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {c.status}
                  </span>
                </div>
              </div>
              {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

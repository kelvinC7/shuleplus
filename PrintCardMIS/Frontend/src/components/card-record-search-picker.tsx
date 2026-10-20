'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Search, UserPlus } from 'lucide-react';
import { CardRecordAvatar } from '@/components/card-record-avatar';
import {
  cardStatusLabel,
  cardStatusTone,
  fetchStaff,
  fetchStudents,
  type CardRecord,
  type PersonKind,
} from '@/services/print-card-api';

type Props = {
  schoolId: string | undefined;
  kind: PersonKind;
  selectedIds: Set<string>;
  onAdd: (record: CardRecord) => void;
  classId?: string;
  className?: string;
};

export function CardRecordSearchPicker({
  schoolId,
  kind,
  selectedIds,
  onAdd,
  classId,
  className,
}: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!schoolId || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string> = { search: debounced };
    if (kind === 'STUDENT' && classId) {
      params.classId = classId;
      params.classExact = 'true';
    }
    const load =
      kind === 'STUDENT' ? fetchStudents(schoolId, params) : fetchStaff(schoolId, params);
    void load
      .then((rows) => {
        if (!cancelled) setResults(rows.slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId, kind, debounced, classId]);

  const showPanel = Boolean(schoolId) && (debounced.length >= 2 || loading);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-slate-50/80 to-primary/5 shadow-sm ${className ?? ''}`}
    >
      <div className="border-b border-border/80 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Find & add</p>
        <p className="mt-0.5 text-sm font-semibold text-navy">
          Search by name or ID, then add to selected {kind === 'STUDENT' ? 'students' : 'staff'}
        </p>
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!schoolId}
            placeholder={
              schoolId
                ? kind === 'STUDENT'
                  ? 'Type student name or ID…'
                  : 'Type staff name or ID…'
                : 'Select a school first'
            }
            className="input w-full pl-9"
            aria-label="Search to add to selection"
          />
        </div>

        {!schoolId && (
          <p className="mt-3 text-xs text-muted">Choose a school to search {kind === 'STUDENT' ? 'students' : 'staff'}.</p>
        )}

        {schoolId && debounced.length > 0 && debounced.length < 2 && (
          <p className="mt-3 text-xs text-muted">Type at least 2 characters to search.</p>
        )}

        {showPanel && (
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {loading && (
              <li className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </li>
            )}
            {!loading && debounced.length >= 2 && results.length === 0 && (
              <li className="rounded-xl border border-dashed border-border bg-white/80 px-4 py-6 text-center text-sm text-muted">
                No matches for &ldquo;{debounced}&rdquo;
              </li>
            )}
            {!loading &&
              results.map((record) => {
                const added = selectedIds.has(record.id);
                return (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-primary/30"
                  >
                    <CardRecordAvatar fullName={record.fullName} photoUrl={record.photoUrl} kind={kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy">{record.fullName}</p>
                      <p className="truncate text-xs text-muted">
                        {record.personCode}
                        {record.className ? ` · ${record.className}` : ''}
                        {record.role ? ` · ${record.role}` : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cardStatusTone(record.status)}`}
                    >
                      {cardStatusLabel(record.status)}
                    </span>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => onAdd(record)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-primary transition hover:bg-navy-light disabled:cursor-default disabled:bg-emerald-600 disabled:text-white"
                    >
                      {added ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Selected
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          Add to selected
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}

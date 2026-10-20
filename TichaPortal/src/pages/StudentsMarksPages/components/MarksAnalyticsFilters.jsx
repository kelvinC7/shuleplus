import { useEffect, useMemo, useRef } from 'react';
import { Filter } from 'lucide-react';

function orderWithCurrentFirst(items, current) {
  if (!current || !items?.length) return items || [];
  const rest = items.filter((x) => x !== current).sort((a, b) => String(a).localeCompare(String(b)));
  return items.includes(current) ? [current, ...rest] : rest;
}

export default function MarksAnalyticsFilters({ filters, selected, onChange, showClass = true, showSubject = true }) {
  const syncedRef = useRef(false);

  const years = orderWithCurrentFirst(filters?.academic_years || [], filters?.current_academic_year);
  const terms = orderWithCurrentFirst(filters?.terms || [], filters?.current_term || selected?.term);
  const assignments = filters?.assignments || [];

  const value = {
    academic_year: selected?.academic_year || filters?.current_academic_year || years[0] || '',
    term: selected?.term || filters?.current_term || terms[0] || '',
    class_name: selected?.class_name || '',
    subject_name: selected?.subject_name || '',
  };

  const classes = useMemo(() => {
    const all = [...new Set(assignments.map((a) => a.class_name).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
    if (!value.subject_name) return all.length ? all : [...(filters?.classes || [])].sort();
    return [...new Set(assignments.filter((a) => a.subject_name === value.subject_name).map((a) => a.class_name))]
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [assignments, filters?.classes, value.subject_name]);

  const courses = useMemo(() => {
    const all = [...new Set(assignments.map((a) => a.subject_name).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
    if (!value.class_name) return all.length ? all : [...(filters?.courses || [])].sort();
    return [...new Set(assignments.filter((a) => a.class_name === value.class_name).map((a) => a.subject_name))]
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [assignments, filters?.courses, value.class_name]);

  useEffect(() => {
    if (syncedRef.current || !filters?.current_academic_year) return;
    syncedRef.current = true;
    onChange({
      academic_year: filters.current_academic_year,
      term: filters.current_term || terms[0] || '',
      class_name: '',
      subject_name: '',
    });
  }, [filters, onChange, terms]);

  if (!years.length && !terms.length && !classes.length) return null;

  const emit = (patch) => {
    const next = { ...value, ...patch };
    if (patch.subject_name !== undefined && patch.class_name === undefined) {
      const classStillValid = !next.class_name || classes.includes(next.class_name);
      if (!classStillValid) next.class_name = '';
    }
    if (patch.class_name !== undefined && patch.subject_name === undefined) {
      const subjectStillValid = !next.subject_name || courses.includes(next.subject_name);
      if (!subjectStillValid) next.subject_name = '';
    }
    onChange(next);
  };

  const selectClass =
    'h-10 w-full min-w-0 rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-[#000435] shadow-sm focus:border-[#FCB038] focus:outline-none focus:ring-2 focus:ring-[#FCB038]/25 sm:min-w-[9rem]';

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        <Filter className="h-3.5 w-3.5 text-[#c87800]" />
        Filters
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {years.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Year</span>
            <select
              value={value.academic_year}
              onChange={(e) => emit({ academic_year: e.target.value })}
              className={selectClass}
              aria-label="Academic year"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}
        {terms.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Term</span>
            <select
              value={value.term}
              onChange={(e) => emit({ term: e.target.value })}
              className={selectClass}
              aria-label="Term"
            >
              {terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        {showClass && classes.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Class</span>
            <select
              value={value.class_name}
              onChange={(e) => emit({ class_name: e.target.value })}
              className={selectClass}
              aria-label="Class"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        {showSubject && courses.length > 0 && (
          <label className="block col-span-2 lg:col-span-1">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Subject</span>
            <select
              value={value.subject_name}
              onChange={(e) => emit({ subject_name: e.target.value })}
              className={selectClass}
              aria-label="Subject"
            >
              <option value="">All subjects</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import {
  downloadLessonPlanExport,
  fetchLessonPlanningContext,
  listLessonPlansPaginated,
} from '../../services/lessonPlanningApi';

export default function LessonPlanBookPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [format, setFormat] = useState('pdf');
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ academicYear: '', term: '', subject: '' });

  useEffect(() => {
    (async () => {
      const ctx = await fetchLessonPlanningContext();
      setFilters((f) => ({ ...f, academicYear: ctx.academicYear, term: ctx.term }));
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listLessonPlansPaginated({
          page: '1',
          pageSize: '50',
          academicYear: filters.academicYear || undefined,
          term: filters.term || undefined,
          subject: filters.subject || undefined,
        });
        if (!cancelled) {
          setPlans(res.items || []);
          setSelected(new Set((res.items || []).map((p) => p.id)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await downloadLessonPlanExport(id, format);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <LessonPlanningLayout
      title="Download lesson plan book"
      subtitle="Export selected plans as PDF or DOCX."
    >
      <div className="pb-24 lg:pb-0">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="order-2 space-y-3 rounded-lg border border-slate-200 bg-white p-5 lg:order-1 lg:col-span-1">
          <label className="block text-xs font-semibold uppercase text-slate-500">Academic year</label>
          <input
            className="min-h-[40px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={filters.academicYear}
            onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
          />
          <label className="block text-xs font-semibold uppercase text-slate-500">Term</label>
          <input
            className="min-h-[40px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={filters.term}
            onChange={(e) => setFilters({ ...filters, term: e.target.value })}
          />
          <label className="block text-xs font-semibold uppercase text-slate-500">Format</label>
          <select className="min-h-[40px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
          </select>
          <button
            type="button"
            disabled={busy || !selected.size}
            onClick={() => void downloadSelected()}
            className="hidden min-h-[40px] w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-50 lg:block"
            style={{ background: '#000435' }}
          >
            {busy ? 'Downloading…' : `Download ${selected.size} plan(s)`}
          </button>
        </div>
        <div className="order-1 rounded-lg border border-slate-200 bg-white p-5 lg:order-2 lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#000435]" />
            </div>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-auto text-sm">
              {plans.map((p) => (
                <li key={p.id} className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300"
                  />
                  <div>
                    <p className="font-semibold text-[#000435]">{p.lesson?.title}</p>
                    <p className="text-xs text-slate-500">
                      {p.subjectLabel} · {p.className} · Unit {p.lesson?.unit?.unitNumber}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          disabled={busy || !selected.size}
          onClick={() => void downloadSelected()}
          className="min-h-[44px] w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#000435' }}
        >
          {busy ? 'Downloading…' : `Download ${selected.size} plan(s)`}
        </button>
      </div>
    </LessonPlanningLayout>
  );
}

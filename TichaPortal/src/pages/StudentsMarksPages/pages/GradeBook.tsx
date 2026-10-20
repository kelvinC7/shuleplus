import { useState, useEffect } from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { fetchGradebookMatrix } from '../../../services/marksApi';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';

const NAVY = '#000435';

export default function GradeBook() {
  const [params, setParams] = useState<{ class_name?: string; subject_name?: string }>({});
  const [matrix, setMatrix] = useState<{ columns: { slug: string; label: string }[]; students: { name: string; scores: Record<string, number> }[] } | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [search, setSearch] = useState('');
  const { filters, selected } = useTeacherMarksAnalytics(params);

  const loadMatrix = async (p: typeof params) => {
    if (!p.class_name) {
      setMatrix(null);
      return;
    }
    setLoadingMatrix(true);
    try {
      const res = await fetchGradebookMatrix(p.class_name, p.subject_name);
      if (res?.success) setMatrix(res.data);
    } catch {
      setMatrix(null);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const onFilterChange = (p: typeof params) => {
    setParams(p);
    loadMatrix(p);
  };

  useEffect(() => {
    if (selected?.class_name && selected.class_name !== params.class_name) {
      const next = { ...params, class_name: selected.class_name, subject_name: selected.subject_name };
      setParams(next);
      loadMatrix(next);
    }
  }, [selected?.class_name, selected?.subject_name]);

  const columns = matrix?.columns || [];
  const students = (matrix?.students || []).filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Grade Book</h1>
          <p className="text-gray-500 text-sm mt-1">Live scores from Academic assessments</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={onFilterChange} showSubject />
      </div>

      {!params.class_name ? (
        <p className="text-sm text-gray-400 text-center py-12 rounded-xl border border-dashed border-gray-200">
          Select a class to load the grade book.
        </p>
      ) : loadingMatrix ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl p-4 border border-gray-200 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <button type="button" className="flex items-center gap-2 px-4 py-2 bg-[#000435] text-white rounded-lg text-sm">
              <Download size={16} /> Export
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50">Student</th>
                    {columns.map((c) => (
                      <th key={c.slug} className="text-center px-2 py-3 font-medium text-gray-600 whitespace-nowrap">{c.label}</th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-600 bg-gray-50">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr><td colSpan={columns.length + 2} className="py-12 text-center text-gray-400">No students or marks yet</td></tr>
                  ) : (
                    students.map((row, i) => {
                      const vals = columns.map((c) => row.scores?.[c.slug]).filter((v) => v != null) as number[];
                      const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
                      return (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                          <td className="px-3 py-3 font-medium sticky left-0 bg-white" style={{ color: NAVY }}>{row.name}</td>
                          {columns.map((c) => {
                            const val = row.scores?.[c.slug];
                            return (
                              <td key={c.slug} className={`text-center px-2 py-3 font-medium ${
                                val == null ? 'text-gray-300' :
                                val >= 80 ? 'text-green-600' : val >= 60 ? 'text-blue-600' : val >= 50 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {val != null ? `${val}%` : '-'}
                              </td>
                            );
                          })}
                          <td className="text-center px-3 py-3 font-bold bg-gray-50">{avg != null ? `${avg}%` : '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

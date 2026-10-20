import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function StudentProfiles() {
  const [params, setParams] = useState({});
  const [search, setSearch] = useState('');
  const { loading, error, students, filters, selected } = useTeacherMarksAnalytics(params);

  const filtered = students.filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Student Profiles</h1>
          <p className="text-gray-500 text-sm mt-1">Performance snapshot from your marks</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold" style={{ color: NAVY }}>{s.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{s.class_name}</p>
              </div>
              {s.grade && (
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  s.grade === 'A' ? 'bg-green-50 text-green-600' :
                  s.grade === 'B' ? 'bg-blue-50 text-blue-600' :
                  s.grade === 'C' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                }`}>{s.grade}</span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums" style={{ color: NAVY }}>
              {s.average != null ? `${s.average}%` : '-'}
            </p>
            <p className="text-xs text-gray-400">Term average</p>
            {s.at_risk && (
              <p className="mt-2 text-xs font-medium text-red-600">At risk - below 40%</p>
            )}
          </div>
        ))}
        {!filtered.length && (
          <p className="col-span-full text-sm text-gray-400 text-center py-12">No student data yet</p>
        )}
      </div>
    </div>
  );
}

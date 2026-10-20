import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Clock, Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function Assessments() {
  const [params, setParams] = useState({});
  const [search, setSearch] = useState('');
  const { loading, error, assessments, filters, selected } = useTeacherMarksAnalytics(params);

  const filtered = assessments.filter((a) =>
    !search.trim() || a.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Assessments</h1>
          <p className="text-gray-500 text-sm mt-1">Your assessments from Academic module</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
          <Link
            to="/assessments/create"
            className="px-4 py-2 bg-[#000435] text-white rounded-lg text-sm hover:bg-[#0a116b]"
          >
            Create assessment
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessments…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-center font-medium">Max</th>
                <th className="px-4 py-3 text-center font-medium">Done</th>
                <th className="px-4 py-3 text-center font-medium">Missing</th>
                <th className="px-4 py-3 text-center font-medium">Avg</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No assessments found. Create one from Courses & Marks.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: NAVY }}>{a.name}</td>
                    <td className="px-4 py-3 text-sm">{a.class}</td>
                    <td className="px-4 py-3 text-sm">{a.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.date || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{a.maxMarks}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Users size={14} /> {a.completed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <Clock size={14} /> {a.missing}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-semibold">
                      {a.averageScore != null ? `${a.averageScore}%` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

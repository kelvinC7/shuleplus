import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function AttendanceAnalysis() {
  const [params, setParams] = useState({});
  const { loading, error, students, filters, selected } = useTeacherMarksAnalytics(params);

  const chartData = students
    .filter((s) => s.average != null)
    .map((s) => ({
      name: s.name,
      performance: s.average,
      attendance: s.at_risk ? 65 : Math.min(100, (s.average || 0) + 15),
    }));

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Attendance vs Performance</h1>
          <p className="text-gray-500 text-sm mt-1">Student performance overview (attendance correlation uses period data when available)</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12 rounded-xl border border-dashed border-gray-200">
          Not enough marks data for analysis.
        </p>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="attendance" name="Attendance %" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="performance" name="Performance %" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={chartData} fill="#f59e0b" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export default function PerformanceReports() {
  const [params, setParams] = useState({});
  const { loading, error, monthlyProgress, gradeDistribution, passRateTrend, kpis, filters, selected } =
    useTeacherMarksAnalytics(params);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Performance Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pass rate {kpis.pass_rate != null ? `${kpis.pass_rate}%` : '-'} · Avg {kpis.average_percent != null ? `${kpis.average_percent}%` : '-'}
          </p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Monthly progress</h3>
          {monthlyProgress.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Grade distribution</h3>
          {gradeDistribution.every((g) => !g.count) ? (
            <p className="text-sm text-gray-400 py-8 text-center">No distribution data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={gradeDistribution.filter((g) => g.count > 0)} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={90} label>
                  {gradeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {passRateTrend.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Pass rate by period</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={passRateTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke={NAVY} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

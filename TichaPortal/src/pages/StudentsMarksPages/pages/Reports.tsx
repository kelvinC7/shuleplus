import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';
const AMBER = '#f59e0b';

export default function Reports() {
  const [params, setParams] = useState({});
  const { loading, error, classPerformance, subjectScores, termTrend, assessments, filters, selected } =
    useTeacherMarksAnalytics(params);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Academic Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Live class and subject performance</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Class performance</h3>
          {classPerformance.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" fill={NAVY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Subject scores</h3>
          {subjectScores.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={subjectScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" fill={AMBER} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Term trend</h3>
        {termTrend.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No trend data</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={termTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke={AMBER} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold" style={{ color: NAVY }}>Recent assessments</div>
        <div className="divide-y divide-gray-100">
          {assessments.slice(0, 8).map((a) => (
            <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <span className="font-medium">{a.name}</span>
              <span className="text-gray-500">{a.class} · {a.averageScore != null ? `${a.averageScore}%` : '-'}</span>
            </div>
          ))}
          {!assessments.length && <p className="px-5 py-8 text-center text-gray-400 text-sm">No assessments</p>}
        </div>
      </div>
    </div>
  );
}

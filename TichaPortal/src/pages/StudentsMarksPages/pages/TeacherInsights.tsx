import { useState } from 'react';
import { TrendingUp, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function TeacherInsights() {
  const [params, setParams] = useState({});
  const { loading, error, insights, termTrend, interventionPlans, kpis, filters, selected } =
    useTeacherMarksAnalytics(params);

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
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Teacher Insights</h1>
          <p className="text-gray-500 text-sm mt-1">Live insights from your published marks</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl p-5 border ${
              item.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {item.type === 'success' ? (
                <TrendingUp size={20} className="text-green-600 shrink-0" />
              ) : (
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              )}
              <p className="text-sm font-medium text-gray-800">{item.text}</p>
            </div>
          </div>
        ))}
        {!insights.length && (
          <p className="text-sm text-gray-400 col-span-2 text-center py-8">Record marks to generate insights.</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Performance trend</h3>
        {termTrend.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No trend data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={termTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {interventionPlans.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-amber-500" />
            <h3 className="font-semibold" style={{ color: NAVY }}>Suggested interventions</h3>
            <span className="text-xs text-gray-400">({kpis.at_risk_count ?? 0} at risk)</span>
          </div>
          <div className="space-y-3">
            {interventionPlans.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium" style={{ color: NAVY }}>{rec.student} · {rec.class}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.action}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  rec.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                }`}>
                  {rec.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

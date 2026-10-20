import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function Notifications() {
  const [params, setParams] = useState({});
  const { loading, error, alerts, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Alerts from marks and at-risk students</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-4 rounded-xl border ${
              alert.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
            }`}
          >
            <Bell size={18} className={alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-1">{alert.date}</p>
            </div>
          </div>
        ))}
        {!alerts.length && (
          <p className="text-sm text-gray-400 text-center py-12 rounded-xl border border-dashed border-gray-200">
            No alerts - all caught up.
          </p>
        )}
      </div>
    </div>
  );
}

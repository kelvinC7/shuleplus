import { useState } from 'react';
import { Target, Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function InterventionPlans() {
  const [params, setParams] = useState({});
  const { loading, error, interventionPlans, atRiskStudents, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Intervention Plans</h1>
          <p className="text-gray-500 text-sm mt-1">{atRiskStudents.length} students below 40% average</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="space-y-3">
        {interventionPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Target size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold" style={{ color: NAVY }}>{plan.student}</p>
                <p className="text-xs text-gray-500">{plan.class} · {plan.issue}</p>
                <p className="text-sm text-gray-600 mt-1">{plan.action}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              plan.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
            }`}>
              {plan.priority}
            </span>
          </div>
        ))}
        {!interventionPlans.length && (
          <p className="text-sm text-gray-400 text-center py-12 rounded-xl border border-dashed border-gray-200">
            No intervention plans needed right now.
          </p>
        )}
      </div>
    </div>
  );
}

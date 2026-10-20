import { useCallback, useEffect, useState } from 'react';
import { fetchMarksAnalytics } from '../services/marksApi';

export function useTeacherMarksAnalytics(initialParams = {}) {
  const [params, setParams] = useState(initialParams);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMarksAnalytics(params);
      if (res?.success) setData(res.data);
      else setError(res?.message || 'Failed to load analytics');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { load(); }, [load]);

  return {
    data,
    loading,
    error,
    reload: load,
    params,
    setParams,
    kpis: data?.kpis || {},
    classPerformance: data?.class_performance || [],
    courseClassComparison: data?.course_class_comparison || [],
    subjectScores: data?.subject_scores || [],
    students: data?.students || [],
    atRiskStudents: data?.at_risk_students || [],
    strongStudents: data?.strong_students || [],
    weakStudents: data?.weak_students || [],
    insights: data?.insights || [],
    termTrend: data?.term_trend || data?.monthly_progress || [],
    monthlyProgress: data?.monthly_progress || data?.term_trend || [],
    gradeDistribution: data?.grade_distribution || [],
    passRateTrend: data?.pass_rate_trend || [],
    assessments: data?.assessments || [],
    alerts: data?.alerts || [],
    interventionPlans: data?.intervention_plans || [],
    attendanceVsPerformance: data?.attendance_vs_performance || [],
    filters: data?.filters,
    selected: data?.selected,
  };
}

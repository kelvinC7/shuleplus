import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import TeacherPageShell from '../components/TeacherPageShell';
import { useAuth } from '../context/AuthContext';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchMyCourses, tpApiError } from '../services/teacherPortalApi';

const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm text-[#000435] hover:bg-slate-50';

export default function MyCourses() {
  const { teacher } = useAuth();
  const { ready } = useTpAcademic();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMyCourses());
    } catch (err) {
      setError(tpApiError(err, 'Could not load your courses'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.grouped ?? [];
    if (!q) return list;
    return list.filter(
      (group) =>
        group.subjectName.toLowerCase().includes(q) ||
        group.classes.some((c) => c.className.toLowerCase().includes(q))
    );
  }, [data?.grouped, search]);

  const firstName = teacher?.first_name || 'Teacher';

  const classCount = (data?.grouped ?? []).reduce((n, g) => n + g.classes.length, 0);

  const stats = [
    { label: 'Subjects', value: loading && !data ? '-' : (data?.grouped?.length ?? 0) },
    { label: 'Classes', value: loading && !data ? '-' : classCount },
    { label: 'Assignments', value: loading && !data ? '-' : (data?.assignments?.length ?? 0) },
    { label: 'Periods / Week', value: loading && !data ? '-' : (data?.totalPeriods ?? 0) },
  ];

  const actions = (
    <>
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="tp-input w-full pl-9 py-2.5"
        />
      </div>
      <button type="button" onClick={() => void load()} className={btn}>
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </>
  );

  return (
    <TeacherPageShell
      title="My Courses"
      subtitle="Your teaching assignments this term"
      stats={stats}
      actions={actions}
    >
      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {filtered.length === 0 ? (
            <div className="tp-card px-4 py-12 text-center text-sm text-slate-500">No courses found.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((group) => (
                <div key={group.subjectName} className="tp-card overflow-hidden p-0">
                  <div className="tp-card-header border-b border-black/[0.06]">
                    <h3>{group.subjectName}</h3>
                    <span className="ml-auto text-xs font-normal text-slate-500">{group.totalPeriods} p/w</span>
                  </div>
                  <ul className="divide-y divide-black/[0.06]">
                    {group.classes.map((cls) => (
                      <li
                        key={`${group.subjectName}-${cls.className}`}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-[#000435]">{cls.className}</p>
                          <p className="text-xs text-slate-500">
                            {cls.periodsPerWeek} periods{cls.room ? ` · ${cls.room}` : ''}
                          </p>
                        </div>
                        <Link
                          to={`/assessments/create?subject=${encodeURIComponent(group.subjectName)}&className=${encodeURIComponent(cls.className)}${
                            cls.classId ? `&classId=${encodeURIComponent(cls.classId)}` : ''
                          }`}
                          className={`${btn} w-full sm:w-auto text-xs`}
                        >
                          New assessment
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </TeacherPageShell>
  );
}

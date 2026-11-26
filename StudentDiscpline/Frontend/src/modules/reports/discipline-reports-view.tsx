'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, RefreshCw, Search, AlertTriangle, ShieldAlert, CheckCircle2, Clock3 } from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import { iamApi } from '@/services/iam-api';
import { exportToExcel, exportToPdf } from '@/lib/export-utils';
import type { DisciplineCase } from '@/types/discipline';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function caseLabel(c: DisciplineCase) {
  return c.markName || c.customCaseName || c.category || 'Case';
}

export function DisciplineReportsView() {
  const { user, summary } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<DisciplineCase[]>([]);
  const [org, setOrg] = useState<{ name?: string; logoUrl?: string | null }>({});

  const [search, setSearch] = useState('');
  const [className, setClassName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [date, setDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await disciplineApi.cases({
        className: className || undefined,
        caseType: caseType || undefined,
        academicYear: academicYear || undefined,
        incidentDate: date || undefined,
        search: search || undefined,
      });
      setCases(res.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load cases'));
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [className, caseType, academicYear, date, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const res = await iamApi.get('/organization-admin/profile');
        const d = res.data?.data || res.data || {};
        setOrg({ name: d.name || d.organizationName || d.schoolName || summary?.organizationName, logoUrl: d.logoUrl || d.logo || d.imageUrl || null });
      } catch {
        try {
          const res = await iamApi.get('/auth/profile');
          const d = res.data?.data || res.data || {};
          setOrg({ name: d.organizationName || d.name || summary?.organizationName, logoUrl: d.logoUrl || d.logo || null });
        } catch {
          setOrg({ name: summary?.organizationName || 'School', logoUrl: null });
        }
      }
    })();
  }, [summary?.organizationName]);

  const filtered = useMemo(() => {
    let rows = cases;
    if (term.trim()) {
      const t = term.trim().toLowerCase();
      rows = rows.filter((c) => String((c as any).term || c.academicYear || '').toLowerCase().includes(t));
    }
    return rows;
  }, [cases, term]);

  const classes = useMemo(() => Array.from(new Set(cases.map((c) => c.className).filter(Boolean))).sort(), [cases]);
  const caseTypes = useMemo(() => Array.from(new Set(cases.map((c) => caseLabel(c)).filter(Boolean))).sort(), [cases]);
  const years = useMemo(() => Array.from(new Set(cases.map((c) => c.academicYear).filter(Boolean) as string[])).sort().reverse(), [cases]);
  const terms = useMemo(() => ['Term 1', 'Term 2', 'Term 3'], []);

  const stats = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((c) => ['Open', 'Under Review', 'Pending'].includes(c.status)).length;
    const resolved = filtered.filter((c) => ['Closed', 'Resolved'].includes(c.status)).length;
    const deducted = filtered.reduce((s, c) => s + (c.appliedPoints && c.appliedPoints < 0 ? Math.abs(c.appliedPoints) : 0), 0);
    return { total, open, resolved, deducted };
  }, [filtered]);

  const exportRows = useMemo(() => filtered.map((c, i) => ({
    no: i + 1,
    studentName: c.studentName,
    studentCode: c.studentCode || '',
    className: c.className || '',
    case: caseLabel(c),
    category: c.category || '',
    incidentDate: fmtDate(c.incidentDate),
    academicYear: c.academicYear || '',
    marksDeducted: c.appliedPoints ?? '',
    scoreBefore: c.scoreBefore ?? '',
    remains: c.scoreAfter ?? '',
    status: c.status || '',
  })), [filtered]);

  const exportColumns = [
    { header: 'No', accessor: 'no' },
    { header: 'Student Name', accessor: 'studentName' },
    { header: 'Student Code', accessor: 'studentCode' },
    { header: 'Class', accessor: 'className' },
    { header: 'Case', accessor: 'case' },
    { header: 'Category', accessor: 'category' },
    { header: 'Incident Date', accessor: 'incidentDate' },
    { header: 'Academic Year', accessor: 'academicYear' },
    { header: 'Marks Deducted', accessor: 'marksDeducted' },
    { header: 'Score Before', accessor: 'scoreBefore' },
    { header: 'Remains', accessor: 'remains' },
    { header: 'Status', accessor: 'status' },
  ];

  const subtitle = [
    className ? `Class: ${className}` : null,
    caseType ? `Case: ${caseType}` : null,
    term ? `Term: ${term}` : null,
    academicYear ? `Academic Year: ${academicYear}` : null,
    date ? `Date: ${fmtDate(date)}` : null,
  ].filter(Boolean).join(' | ') || 'All registered cases';

  async function onExportPdf() {
    if (!exportRows.length) { toast.error('No cases to export'); return; }
    await exportToPdf({ title: 'Discipline Cases Report', subtitle, columns: exportColumns, data: exportRows as any, userName: user?.email || 'System', schoolName: org.name || summary?.organizationName || 'School', logoUrl: org.logoUrl, orientation: 'landscape' });
  }

  function onExportExcel() {
    if (!exportRows.length) { toast.error('No cases to export'); return; }
    exportToExcel({ title: 'Discipline Cases Report', subtitle, columns: exportColumns, data: exportRows as any, userName: user?.email || 'System', schoolName: org.name || summary?.organizationName || 'School' });
  }

  function reset() {
    setSearch(''); setClassName(''); setCaseType(''); setTerm(''); setAcademicYear(''); setDate('');
  }

  return (
    <DisciplinePageLayout
      title="Discipline Cases Report"
      subtitle="All registered cases with student details, marks deducted, and remaining score"
      kpis={[
        { label: 'Total Cases', value: stats.total },
        { label: 'Open / Pending', value: stats.open },
        { label: 'Resolved / Closed', value: stats.resolved },
        { label: 'Marks Deducted', value: stats.deducted },
      ]}
    >
      <div className="hr-card mb-4 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter size={18} className="text-[#FCB038]" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Filters</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>
            <button type="button" className="btn-secondary" onClick={reset}>Clear</button>
            <button type="button" className="btn-secondary" onClick={onExportExcel}><FileSpreadsheet size={15} /> Export Excel</button>
            <button type="button" className="btn-primary" onClick={() => void onExportPdf()}><FileText size={15} /> Export PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative block xl:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="discipline-input pl-9" placeholder="Search student, case, code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="discipline-input" value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="discipline-input" value={caseType} onChange={(e) => setCaseType(e.target.value)}>
            <option value="">All Cases</option>
            {caseTypes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="discipline-input" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="">All Terms</option>
            {terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="discipline-input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            <option value="">All Academic Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <input type="date" className="discipline-input" value={date} onChange={(e) => setDate(e.target.value)} title="Specific date" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="hr-card p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-700"><ShieldAlert size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Cases</p><p className="text-2xl font-bold text-[#000435]">{stats.total}</p></div></div></div>
        <div className="hr-card p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><Clock3 size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open / Pending</p><p className="text-2xl font-bold text-[#000435]">{stats.open}</p></div></div></div>
        <div className="hr-card p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved / Closed</p><p className="text-2xl font-bold text-[#000435]">{stats.resolved}</p></div></div></div>
        <div className="hr-card p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-red-50 p-2 text-red-600"><AlertTriangle size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marks Deducted</p><p className="text-2xl font-bold text-[#000435]">{stats.deducted}</p></div></div></div>
      </div>

      <div className="hr-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-[#000435]">Registered Cases</h3>
            <p className="text-xs text-slate-500">{filtered.length} record{filtered.length === 1 ? '' : 's'} found</p>
          </div>
          <div className="hidden text-xs text-slate-500 sm:block">{subtitle}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Incident Date</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3 text-right">Marks Deducted</th>
                <th className="px-4 py-3 text-right">Remains</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">Loading cases...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No cases found for the selected filters.</td></tr>
              ) : filtered.map((c, i) => {
                const deducted = c.appliedPoints != null ? Math.abs(Math.min(0, c.appliedPoints)) : 0;
                const statusCls = ['Closed', 'Resolved'].includes(c.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ['Open', 'Pending', 'Under Review'].includes(c.status) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200';
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.studentName}</div>
                      <div className="text-xs text-slate-500">{c.studentCode || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.className || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{caseLabel(c)}</div>
                      <div className="text-xs text-slate-500">{c.category || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(c.incidentDate)}</td>
                    <td className="px-4 py-3 text-slate-700">{c.academicYear || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{deducted > 0 ? `-${deducted}` : (c.appliedPoints ?? '—')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#000435]">{c.scoreAfter ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusCls}`}>{c.status || '—'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DisciplinePageLayout>
  );
}

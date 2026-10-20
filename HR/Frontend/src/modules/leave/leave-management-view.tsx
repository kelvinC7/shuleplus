'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  MoreVertical,
  PieChart as PieChartIcon,
  Plus,
  Printer,
  Search,
  Ban,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HrPageLayout } from '@/components/hr-page-layout';
import { useAuth } from '@/contexts/auth-context';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { LeaveFilters, LeaveKpis, LeavePolicy, LeaveRequestRow, LeaveStatus } from '@/types/leave';
import { LeaveRegisterModal } from './leave-register-modal';

/**
 * Leave Management Dashboard — mirrors the visual language of the
 * department registration module. Brand colors: #000435 (navy) / #FCB038 (amber).
 *
 * NOTE: assumes the following are added to `hrApi`:
 *   hrApi.leaveKpis()               -> { data: LeaveKpis }
 *   hrApi.leaveRequests(filters)    -> { data: LeaveRequestRow[] }
 *   hrApi.leaveCharts()             -> { data: { utilization, byMonth, byDepartment, byType, trend } }
 *   hrApi.approveLeave(id)
 *   hrApi.rejectLeave(id, reason)
 *   hrApi.cancelLeave(id)
 * If these don't exist yet, stub them in hr-api.ts following the same
 * pattern as hrApi.departments() / hrApi.updateDepartment().
 */

const NAVY = '#000435';
const AMBER = '#FCB038';
const CHART_PALETTE = [AMBER, NAVY, '#5B6FE0', '#2FBF71', '#E0575B', '#8C6BFF'];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EMPTY_FILTERS: LeaveFilters = {
  search: '',
  department: '',
  branch: '',
  leaveType: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  manager: '',
  employmentType: '',
};

function statusBadge(status: LeaveStatus) {
  const map: Record<LeaveStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    PENDING: { bg: 'bg-[#FCB038]/12', text: 'text-[#946207]', icon: <Clock size={12} />, label: 'Pending' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 size={12} />, label: 'Approved' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-600', icon: <XCircle size={12} />, label: 'Rejected' },
    CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-500', icon: <Ban size={12} />, label: 'Cancelled' },
  };
  const cfg = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sublabel,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,4,53,0.08)] sm:p-5">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            accent ? 'bg-[#FCB038]/15 text-[#946207]' : 'bg-[#000435]/[0.06] text-[#000435]'
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#000435]">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      {sublabel && <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p>}
    </div>
  );
}

function ChartCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,4,53,0.08)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#000435]">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#000435]/[0.06] text-[#000435]">
            {icon}
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function DropdownFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        className="input appearance-none pr-8 text-xs font-semibold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function LeaveManagementView() {
  const toast = useToast();
  const { authorized, ready } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<LeaveKpis | null>(null);
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [charts, setCharts] = useState<{
    utilization: { month: string; used: number; entitled: number }[];
    byMonth: { month: string; requests: number }[];
    byDepartment: { department: string; count: number }[];
    byType: { type: string; count: number }[];
    trend: { month: string; approved: number; rejected: number }[];
  } | null>(null);
  const [filters, setFilters] = useState<LeaveFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const authBlockedRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await hrApi.leaveRequests(filters);
      setRows(data.data);
      authBlockedRef.current = false;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = getApiErrorMessage(err, 'Failed to load leave requests.');
      if (status === 401) {
        authBlockedRef.current = true;
      }
      if (lastErrorRef.current !== message) {
        lastErrorRef.current = message;
        toast.error(message, 'Load failed');
      }
    }
  }, [filters, toast]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, cRes] = await Promise.all([hrApi.leaveKpis(), hrApi.leaveCharts()]);
      setKpis(kRes.data.data);
      setCharts(cRes.data.data);
      authBlockedRef.current = false;
      lastErrorRef.current = null;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = getApiErrorMessage(err, 'Failed to load leave dashboard.');
      if (status === 401) {
        authBlockedRef.current = true;
      }
      if (lastErrorRef.current !== message) {
        lastErrorRef.current = message;
        toast.error(message, 'Load failed');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshAll = useCallback(async () => {
    authBlockedRef.current = false;
    lastErrorRef.current = null;
    await Promise.all([loadDashboard(), loadRequests()]);
  }, [loadDashboard, loadRequests]);

  useEffect(() => {
    authBlockedRef.current = false;
    lastErrorRef.current = null;
  }, [authorized]);

  useEffect(() => {
    if (!ready || !authorized || authBlockedRef.current) {
      if (ready && !authorized) setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        const [kRes, cRes, rRes] = await Promise.all([
          hrApi.leaveKpis(),
          hrApi.leaveCharts(),
          hrApi.leaveRequests(filters),
        ]);
        if (cancelled) return;
        setKpis(kRes.data.data);
        setCharts(cRes.data.data);
        setRows(rRes.data.data);
        authBlockedRef.current = false;
        lastErrorRef.current = null;
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        const message = getApiErrorMessage(err, 'Failed to load leave data.');
        if (status === 401) {
          authBlockedRef.current = true;
        }
        if (lastErrorRef.current !== message) {
          lastErrorRef.current = message;
          toast.error(message, 'Load failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [authorized, filters, ready, toast]);

  async function handleApprove(id: string) {
    try {
      await hrApi.approveLeave(id);
      toast.success('Leave request approved.', 'Approved');
      void loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not approve request.'), 'Action failed');
    }
  }

  async function handleReject(id: string) {
    try {
      await hrApi.rejectLeave(id);
      toast.success('Leave request rejected.', 'Rejected');
      void loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not reject request.'), 'Action failed');
    }
  }

  async function handleCancel(id: string) {
    try {
      await hrApi.cancelLeave(id);
      toast.success('Leave request cancelled.', 'Cancelled');
      void loadRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not cancel request.'), 'Action failed');
    }
  }

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v && v.length > 0).length,
    [filters]
  );

  return (
    <HrPageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#000435] sm:text-2xl">Leave Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track balances, approvals and leave trends across the organization.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-[#000435] transition-colors hover:border-[#FCB038]/50"
            >
              <Download size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_16px_-6px_rgba(0,4,53,0.5)] transition-transform hover:scale-[1.02]"
            >
              <Plus size={14} className="text-[#FCB038]" />
              Register Leave
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={<Users size={16} />} label="Total Employees" value={kpis?.totalEmployees ?? '—'} />
          <KpiCard icon={<CalendarCheck2 size={16} />} label="On Leave Today" value={kpis?.onLeaveToday ?? '—'} accent />
          <KpiCard icon={<Clock size={16} />} label="Pending Requests" value={kpis?.pendingRequests ?? '—'} accent />
          <KpiCard icon={<CheckCircle2 size={16} />} label="Approved This Month" value={kpis?.approvedThisMonth ?? '—'} />
          <KpiCard icon={<XCircle size={16} />} label="Rejected Requests" value={kpis?.rejectedRequests ?? '—'} />
          <KpiCard icon={<AlertCircle size={16} />} label="Balance Alerts" value={kpis?.balanceAlerts ?? '—'} accent />
          <KpiCard icon={<CalendarClock size={16} />} label="Returning Today" value={kpis?.returningToday ?? '—'} />
          <KpiCard icon={<Calendar size={16} />} label="Upcoming Leave" value={kpis?.upcomingLeave ?? '—'} />
          <KpiCard icon={<TrendingUp size={16} />} label="Annual Leave Used" value={kpis?.annualLeaveUsed ?? '—'} sublabel="days, org-wide" />
          <KpiCard icon={<TrendingUp size={16} />} label="Sick Leave Used" value={kpis?.sickLeaveUsed ?? '—'} sublabel="days, org-wide" />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Annual Leave Utilization" icon={<TrendingUp size={13} />}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.utilization ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,4,53,0.04)' }} contentStyle={{ borderRadius: 12, borderColor: '#eef0f5', fontSize: 12 }} />
                <Bar dataKey="entitled" fill="#eef0f5" radius={[6, 6, 0, 0]} name="Entitled" />
                <Bar dataKey="used" fill={AMBER} radius={[6, 6, 0, 0]} name="Used" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Leave Requests by Month" icon={<Calendar size={13} />}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts?.byMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#eef0f5', fontSize: 12 }} />
                <Line type="monotone" dataKey="requests" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: NAVY }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Department Leave Distribution" icon={<Users size={13} />}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.byDepartment ?? []} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0f5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={{ fontSize: 11, fill: '#000435' }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip cursor={{ fill: 'rgba(0,4,53,0.04)' }} contentStyle={{ borderRadius: 12, borderColor: '#eef0f5', fontSize: 12 }} />
                <Bar dataKey="count" fill={NAVY} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Leave Types" icon={<PieChartIcon size={13} />}>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={charts?.byType ?? []}
                    dataKey="count"
                    nameKey="type"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {(charts?.byType ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#eef0f5', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1.5">
                {(charts?.byType ?? []).map((t, i) => (
                  <li key={t.type} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                    <span className="flex-1 truncate">{t.type}</span>
                    <span className="font-bold text-[#000435]">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ChartCard>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,4,53,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search employee…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-[#000435] hover:border-[#FCB038]/50"
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FCB038] text-[10px] font-extrabold text-[#000435]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4 sm:grid-cols-4 lg:grid-cols-5">
              <input
                className="input text-xs"
                placeholder="Department"
                value={filters.department}
                onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
              />
              <input
                className="input text-xs"
                placeholder="Branch"
                value={filters.branch}
                onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
              />
              <input
                className="input text-xs"
                placeholder="Leave type"
                value={filters.leaveType}
                onChange={(e) => setFilters((f) => ({ ...f, leaveType: e.target.value }))}
              />
              <DropdownFilter
                label="Status"
                value={filters.status}
                options={STATUS_OPTIONS}
                onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              />
              <input
                className="input text-xs"
                placeholder="Manager"
                value={filters.manager}
                onChange={(e) => setFilters((f) => ({ ...f, manager: e.target.value }))}
              />
              <input type="date" className="input text-xs" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <input type="date" className="input text-xs" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-xs font-bold text-slate-400 hover:text-[#000435]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_-4px_rgba(0,4,53,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Working Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approver</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                      Loading leave requests…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                      No leave requests match these filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#000435]/[0.06] text-[11px] font-bold text-[#000435]">
                            {row.employeeName
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <div>
                            <p className="font-semibold text-[#000435]">{row.employeeName}</p>
                            <p className="text-[11px] text-slate-400">{row.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-slate-600">{row.leaveType}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.startDate}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.endDate}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#000435]">{row.workingDays}</td>
                      <td className="px-4 py-3">{statusBadge(row.status)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.approver}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#000435]">{row.balanceAfter}</td>
                      <td className="px-4 py-3">
                        <div className="relative flex items-center justify-end gap-1">
                          {row.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(row.id)}
                                title="Approve"
                                className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50"
                              >
                                <ThumbsUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(row.id)}
                                title="Reject"
                                className="flex h-7 w-7 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                              >
                                <ThumbsDown size={14} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openMenuId === row.id && (
                            <div className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(0,4,53,0.25)]">
                              {[
                                { icon: <Eye size={13} />, label: 'View' },
                                { icon: <FileText size={13} />, label: 'Audit Log' },
                                { icon: <Printer size={13} />, label: 'Print' },
                                { icon: <Download size={13} />, label: 'Download PDF' },
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  {item.icon}
                                  {item.label}
                                </button>
                              ))}
                              {row.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(row.id)}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50"
                                >
                                  <Ban size={13} />
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LeaveRegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSuccess={() => void refreshAll()}
      />
    </HrPageLayout>
  );
}
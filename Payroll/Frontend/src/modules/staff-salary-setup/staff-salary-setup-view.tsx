'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Table2,
  UserPlus,
} from 'lucide-react';
import {
  AvatarInitials,
  PayrollDataTable,
  type PayrollTableColumn,
} from '@/components/payroll-data-table';
import { ModeSwitch, SalaryEmpty } from '@/components/salary-ui';
import { formatRwf } from '@/config/payroll-nav';
import { payrollApi, type PayrollStaff } from '@/services/payroll-api';
import {
  DEFAULT_ALLOWANCE_RULES,
  DEFAULT_PAYE_BRACKETS,
  DEFAULT_STATUTORY,
  calcRwandaPayroll,
  normalizeTemplateAllowances,
  type PayrollLineItem,
} from '@/utils/rwandaPayrollEngine';
import { StaffSalaryEditor, type TemplateConfig } from './staff-salary-editor';

type StaffTableRow = PayrollStaff & {
  grossSalary: number;
  netSalary: number;
  packageStatus: 'configured' | 'pending';
  lastUpdated: string | null;
};

type SortKey = 'fullName' | 'employeeNumber' | 'department' | 'grossSalary' | 'netSalary';

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'ON_LEAVE'
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PackageBadge({ status }: { status: StaffTableRow['packageStatus'] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
        status === 'configured'
          ? 'bg-[#FCB038]/15 text-[#000435] ring-[#FCB038]/30'
          : 'bg-slate-100 text-slate-500 ring-slate-200'
      }`}
    >
      {status === 'configured' ? 'Configured' : 'Pending'}
    </span>
  );
}

export function StaffSalarySetupView() {
  const [staff, setStaff] = useState<StaffTableRow[]>([]);
  const [template, setTemplate] = useState<TemplateConfig>({
    statutory: DEFAULT_STATUTORY,
    payeRates: DEFAULT_PAYE_BRACKETS,
    allowanceRules: DEFAULT_ALLOWANCE_RULES,
    templateDeductions: [],
    templateAllowances: [],
  });
  const [templateName, setTemplateName] = useState('Default Rwanda Template');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerStaffId, setDrawerStaffId] = useState<string | null>(null);
  const [mode, setMode] = useState<'normal' | 'netToGross'>('normal');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, tplRes] = await Promise.all([payrollApi.listStaff(), payrollApi.getTemplate()]);
      const tpl = tplRes.data.data as Record<string, unknown>;
      const tplConfig: TemplateConfig = {
        statutory: { ...DEFAULT_STATUTORY, ...(tpl.statutoryRates as object) },
        payeRates: (tpl.payeRates as TemplateConfig['payeRates']) ?? DEFAULT_PAYE_BRACKETS,
        allowanceRules: { ...DEFAULT_ALLOWANCE_RULES, ...(tpl.allowanceRules as object) },
        templateDeductions: ((tpl.deductions as PayrollLineItem[]) ?? []).map((d) => ({
          name: d.name,
          amount: Number(d.amount),
          amountType: d.amountType,
          channel: d.channel,
        })),
        templateAllowances: normalizeTemplateAllowances((tpl.allowances as PayrollLineItem[]) ?? []).map((a) => ({
          name: a.name,
          amount: Number(a.amount),
          amountType: a.amountType,
          channel: a.channel,
          registerKey: a.registerKey,
        })),
      };
      setTemplate(tplConfig);
      setTemplateName(String(tpl.name ?? 'Default Rwanda Template'));

      type StaffWithProfile = PayrollStaff & {
        profile?: {
          basicSalary?: unknown;
          transportAllowance?: unknown;
          housingAllowance?: unknown;
          othersAllowance?: unknown;
          mealAllowance?: unknown;
          updatedAt?: string;
        } | null;
      };

      const rows: StaffTableRow[] = (staffRes.data.data as StaffWithProfile[]).map((s) => {
        const profile = s.profile;
        const basic = Number(profile?.basicSalary ?? s.basicSalary ?? 0);
        const hasManual = Boolean(
          Number(profile?.transportAllowance) ||
            Number(profile?.housingAllowance) ||
            Number(profile?.othersAllowance)
        );
        const calc = calcRwandaPayroll({
          basicSalary: basic,
          transport: Number(profile?.transportAllowance ?? 0),
          housing: Number(profile?.housingAllowance ?? 0),
          others: Number(profile?.othersAllowance ?? 0),
          meal: Number(profile?.mealAllowance ?? 0),
          autoAllowances: tplConfig.allowanceRules.enabled && !hasManual,
          allowanceRules: tplConfig.allowanceRules,
          templateAllowances: tplConfig.templateAllowances,
          templateDeductions: tplConfig.templateDeductions,
          statutory: tplConfig.statutory,
          payeRates: tplConfig.payeRates,
        });
        return {
          ...s,
          grossSalary: calc.gross,
          netSalary: calc.netSalary,
          packageStatus: basic > 0 ? 'configured' : 'pending',
          lastUpdated: profile?.updatedAt ?? null,
        };
      });
      setStaff(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const departments = useMemo(
    () => [...new Set(staff.map((s) => s.department).filter(Boolean))] as string[],
    [staff]
  );
  const positions = useMemo(
    () => [...new Set(staff.map((s) => s.position).filter(Boolean))] as string[],
    [staff]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = staff.filter((s) => {
      if (q && !`${s.fullName} ${s.employeeNumber} ${s.email ?? ''}`.toLowerCase().includes(q)) return false;
      if (department && s.department !== department) return false;
      if (position && s.position !== position) return false;
      if (status && s.status !== status) return false;
      if (packageFilter === 'configured' && s.packageStatus !== 'configured') return false;
      if (packageFilter === 'pending' && s.packageStatus !== 'pending') return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [staff, search, department, position, status, packageFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const drawerStaff = staff.find((s) => s.id === drawerStaffId) ?? null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function exportCsv() {
    const cols = ['Employee ID', 'Name', 'Email', 'Position', 'Department', 'Status', 'Gross', 'Net', 'Package'];
    const lines = filtered.map((r) =>
      [r.employeeNumber, r.fullName, r.email ?? '', r.position ?? '', r.department ?? '', r.status, r.grossSalary, r.netSalary, r.packageStatus].join(',')
    );
    const blob = new Blob([[cols.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'staff-salary-setup.csv';
    a.click();
  }

  const columns: PayrollTableColumn<StaffTableRow>[] = [
    {
      key: 'fullName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <AvatarInitials name={row.fullName} seed={row.id} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{row.fullName}</p>
            <p className="truncate text-xs text-muted">{row.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'employeeNumber',
      header: 'ID',
      sortable: true,
      render: (row) => <span className="font-mono text-xs font-semibold text-navy">{row.employeeNumber}</span>,
    },
    {
      key: 'position',
      header: 'Position',
      render: (row) => <span className="text-sm text-navy">{row.position || '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => <span className="text-sm text-muted">{row.department || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'grossSalary',
      header: 'Gross',
      sortable: true,
      render: (row) => <span className="font-semibold text-navy">{row.grossSalary > 0 ? formatRwf(row.grossSalary) : '—'}</span>,
    },
    {
      key: 'netSalary',
      header: 'Net',
      sortable: true,
      render: (row) => <span className="font-bold text-[#FCB038]">{row.netSalary > 0 ? formatRwf(row.netSalary) : '—'}</span>,
    },
    {
      key: 'package',
      header: 'Package',
      render: (row) => <PackageBadge status={row.packageStatus} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row) => (
        <span className="text-xs text-muted">
          {row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-8rem)] space-y-5">
      {/* Glass toolbar */}
      <div className="sticky top-0 z-20 rounded-[18px] border border-white/60 bg-white/80 p-4 shadow-[0_8px_32px_-8px_rgba(0,4,53,0.12)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FCB038]">Workforce · Payroll</p>
            <h1 className="text-xl font-bold tracking-tight text-[#000435] sm:text-2xl">Staff Salary Setup</h1>
            <p className="mt-0.5 text-sm text-muted">{filtered.length} employees · {templateName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModeSwitch
              value={mode}
              onChange={setMode}
              options={[
                { id: 'normal', label: 'Normal' },
                { id: 'netToGross', label: 'Net-to-Gross' },
              ]}
            />
            <button type="button" className="btn-secondary !rounded-[14px] !py-2.5" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" className="btn-secondary !rounded-[14px] !py-2.5" onClick={exportCsv}>
              <Download size={16} /> Export
            </button>
            <Link href="/employees/register" className="btn-primary !rounded-[14px] !py-2.5">
              <UserPlus size={16} /> Add Employee
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_repeat(4,minmax(0,140px))_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input !rounded-[14px] !py-2.5 pl-10"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select className="input !rounded-[14px] !py-2.5" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select className="input !rounded-[14px] !py-2.5" value={position} onChange={(e) => { setPosition(e.target.value); setPage(1); }}>
            <option value="">All positions</option>
            {positions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select className="input !rounded-[14px] !py-2.5" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <select className="input !rounded-[14px] !py-2.5" value={packageFilter} onChange={(e) => { setPackageFilter(e.target.value); setPage(1); }}>
            <option value="">All packages</option>
            <option value="configured">Configured</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex rounded-[14px] border border-slate-200 bg-white p-1">
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold ${viewMode === 'table' ? 'bg-[#000435] text-white' : 'text-muted'}`}
              onClick={() => setViewMode('table')}
            >
              <Table2 size={14} /> Table
            </button>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold ${viewMode === 'grid' ? 'bg-[#000435] text-white' : 'text-muted'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* Table / Grid — ~70% visual focus; drawer overlays right 30-35% */}
      <div className={`transition-all duration-300 ${drawerStaffId ? 'lg:mr-[min(35vw,520px)]' : ''}`}>
        {viewMode === 'table' ? (
          <PayrollDataTable
            columns={columns}
            data={pageRows}
            rowKey={(r) => r.id}
            selected={selected}
            onSelectRow={(id) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onSelectAll={() =>
              setSelected((prev) =>
                prev.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id))
              )
            }
            allSelected={pageRows.length > 0 && selected.size === pageRows.length}
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            loading={loading}
            emptyMessage="No employees match your filters"
            emptyAction={
              <Link href="/employees/register" className="btn-primary !mt-3">
                <Plus size={16} /> Add Employee
              </Link>
            }
            onView={(row) => setDrawerStaffId(row.id)}
            onEdit={(row) => setDrawerStaffId(row.id)}
            onRowClick={(row) => setDrawerStaffId(row.id)}
            onSort={(key) => toggleSort(key as SortKey)}
            sortKey={sortKey}
            sortDir={sortDir}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-[18px] bg-slate-100" />
              ))}
            {!loading && pageRows.length === 0 && (
              <div className="col-span-full rounded-[18px] border border-slate-100 bg-white p-12">
                <SalaryEmpty message="No employees found" />
              </div>
            )}
            {!loading &&
              pageRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setDrawerStaffId(row.id)}
                  className="rounded-[18px] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#FCB038]/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <AvatarInitials name={row.fullName} seed={row.id} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy">{row.fullName}</p>
                      <p className="text-xs text-muted">{row.employeeNumber}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge status={row.status} />
                        <PackageBadge status={row.packageStatus} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted">Gross</p>
                          <p className="font-semibold text-navy">{row.grossSalary > 0 ? formatRwf(row.grossSalary) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted">Net</p>
                          <p className="font-bold text-[#FCB038]">{row.netSalary > 0 ? formatRwf(row.netSalary) : '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Slide-over backdrop */}
      {drawerStaffId && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#000435]/25 backdrop-blur-[2px] transition-opacity"
          aria-label="Close panel"
          onClick={() => setDrawerStaffId(null)}
        />
      )}

      {/* Slide-over drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(100%,520px)] flex-col border-l border-slate-200/80 bg-white shadow-[-16px_0_48px_-12px_rgba(0,4,53,0.18)] transition-transform duration-300 ease-out ${
          drawerStaffId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {drawerStaff && (
          <StaffSalaryEditor
            key={`${drawerStaff.id}-${mode}`}
            staff={drawerStaff}
            mode={mode}
            template={template}
            templateName={templateName}
            variant="drawer"
            onClose={() => setDrawerStaffId(null)}
            onSaved={() => void load()}
          />
        )}
      </div>
    </div>
  );
}

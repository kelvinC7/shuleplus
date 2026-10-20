'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Download,
  FileSpreadsheet,
  Bell,
  Users,
  Wallet2,
  TrendingUp,
  Percent,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Eye,
  ShoppingBag,
  GraduationCap,
  Building2,
  BadgeCheck,
  AlertCircle,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { Container } from './ui/Primitives';
import { PaymentWizardModal } from './ui/PaymentWizardModal';
import { SchoolFeesPay } from './SchoolFeesPay';
import { RequirementsPay } from './RequirementsPay';
import {
  lookupStudentByCode,
  fetchPublicCircular,
  fetchCircularOptions,
  studentWizardContext,
  type LookupStudent,
} from '../services/portal-api';
import type { PaymentSuccessPayload } from '../services/portal-receipt';
import { downloadModernReceipt } from '../services/portal-receipt';

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

export type FeeStatus = 'full_pay' | 'not_paid' | 'remain_pay' | 'no_fee_card';

export type FeeRegistryRow = {
  id: string;
  student: LookupStudent;
  name: string;
  studentUid: string;
  grade: string;
  classLabel: string;
  schoolName: string;
  totalBill: number | null;
  paid: number;
  balance: number | null;
  status: FeeStatus;
  guardianName: string | null;
  parentPhone: string | null;
  academicYear: string;
  term: string;
};

const RWF = new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 });
function frw(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${RWF.format(Math.max(0, n))} Frw`;
}

function deriveStatus(totalDue: number | null, paid: number): FeeStatus {
  if (totalDue == null) return 'no_fee_card';
  if (Math.abs(totalDue) < 0.005) return 'full_pay';
  if (paid < 0.005) return 'not_paid';
  if (paid + 0.005 >= totalDue) return 'full_pay';
  return 'remain_pay';
}

function statusLabel(s: FeeStatus) {
  switch (s) {
    case 'full_pay':
      return 'Fully Settled';
    case 'not_paid':
      return 'Not Paid';
    case 'remain_pay':
      return 'Partial';
    default:
      return 'No Fee Card';
  }
}

function statusChipClass(s: FeeStatus) {
  switch (s) {
    case 'full_pay':
      return 'bg-emerald-500/12 text-[#0D9B90]';
    case 'remain_pay':
      return 'bg-amber-500/15 text-amber-800';
    case 'not_paid':
      return 'bg-rose-500/10 text-rose-700';
    default:
      return 'bg-navy-900/8 text-navy-700/60';
  }
}

function initialOf(name: string) {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

function exportCsv(rows: FeeRegistryRow[], year: string, term: string) {
  const header = [
    'Student Name',
    'ShuleCode',
    'Class',
    'School',
    'Expected (Frw)',
    'Paid (Frw)',
    'Balance (Frw)',
    'Status',
    'Academic Year',
    'Term',
  ];
  const lines = rows.map((r) =>
    [
      r.name,
      r.studentUid,
      r.grade,
      r.schoolName,
      r.totalBill ?? '',
      r.paid,
      r.balance ?? '',
      statusLabel(r.status),
      year,
      term,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shuleplus-fee-registry-${year}-${term}.csv`.replace(/\s+/g, '-');
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PaymentPage() {
  const [rows, setRows] = useState<FeeRegistryRow[]>([]);
  const [lookupQuery, setLookupQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [yearOptions, setYearOptions] = useState<string[]>(['2025-2026', '2026-2027']);
  const [termOptions, setTermOptions] = useState<string[]>(['Term 1', 'Term 2', 'Term 3']);
  const [lookingUp, setLookingUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<FeeRegistryRow | null>(null);
  const [wizard, setWizard] = useState<'fees' | 'requirements' | null>(null);
  const [wizardStudent, setWizardStudent] = useState<LookupStudent | null>(null);
  const [page, setPage] = useState(1);
  const [lastPayment, setLastPayment] = useState<PaymentSuccessPayload | null>(null);
  const pageSize = 10;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('shuleplus:last-payment');
      if (!raw) return;
      const parsed = JSON.parse(raw) as PaymentSuccessPayload;
      setLastPayment(parsed);
      sessionStorage.removeItem('shuleplus:last-payment');
    } catch {
      /* ignore */
    }
  }, []);

  const classNames = useMemo(() => {
    const set = new Set(rows.map((r) => r.classLabel).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedClass !== 'all' && r.classLabel !== selectedClass) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.studentUid.toLowerCase().includes(q) ||
        (r.student.sdmCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, searchTerm, selectedClass, selectedStatus]);

  const stats = useMemo(() => {
    const active = filteredStudents.length;
    const revenue = filteredStudents.reduce((s, r) => s + r.paid, 0);
    const outstanding = filteredStudents.reduce((s, r) => s + (r.balance ?? 0), 0);
    const totalDue = filteredStudents.reduce((s, r) => s + (r.totalBill ?? 0), 0);
    const rate = totalDue > 0 ? Math.round((revenue / totalDue) * 1000) / 10 : 0;
    return { active, revenue, outstanding, rate };
  }, [filteredStudents]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paged = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedClass, selectedStatus, selectedYear, selectedTerm]);

  const enrichRow = useCallback(
    async (student: LookupStudent, year: string, term: string): Promise<FeeRegistryRow> => {
      const guardian = student.parents[0];
      let totalBill: number | null = null;
      try {
        const circular = await fetchPublicCircular({
          organizationId: student.organizationId,
          academicYear: year,
          term,
          classLabel: student.classLabel,
        });
        totalBill =
          circular.totalFee > 0
            ? circular.totalFee
            : circular.payments.reduce((s, p) => s + p.amount, 0);
      } catch {
        totalBill = null;
      }

      const paid = 0;
      const balance = totalBill == null ? null : Math.max(0, totalBill - paid);
      return {
        id: student.id,
        student,
        name: student.fullName,
        studentUid: student.studentUid,
        grade: student.className ?? student.classLabel ?? '—',
        classLabel: student.classLabel ?? '—',
        schoolName: student.schoolName,
        totalBill,
        paid,
        balance,
        status: deriveStatus(totalBill, paid),
        guardianName: guardian?.name ?? null,
        parentPhone: guardian?.phone ?? null,
        academicYear: year,
        term,
      };
    },
    []
  );

  async function handleLookup(e?: FormEvent) {
    e?.preventDefault();
    if (!lookupQuery.trim()) return;
    setLookingUp(true);
    setError(null);
    try {
      const student = await lookupStudentByCode(lookupQuery.trim());
      let year = selectedYear;
      let term = selectedTerm;
      try {
        const opts = await fetchCircularOptions(student.organizationId, student.classLabel);
        if (opts.academicYears.length) {
          setYearOptions(opts.academicYears);
          if (!opts.academicYears.includes(year)) {
            year = opts.academicYears[0];
            setSelectedYear(year);
          }
        }
        if (opts.terms.length) {
          setTermOptions(opts.terms);
          if (!opts.terms.includes(term)) {
            term = opts.terms[0];
            setSelectedTerm(term);
          }
        }
      } catch {
        /* keep current year/term options */
      }

      const row = await enrichRow(student, year, term);
      setRows((prev) => {
        const without = prev.filter((r) => r.id !== row.id);
        return [row, ...without];
      });
      setLookupQuery('');
      setSelectedStudent(row);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Lookup failed';
      setError(
        /failed to fetch|networkerror|load failed/i.test(raw)
          ? 'Cannot reach Student Management API. Ensure it is running on port 3052.'
          : raw
      );
    } finally {
      setLookingUp(false);
    }
  }

  async function refreshLedger() {
    if (!rows.length) return;
    setRefreshing(true);
    setError(null);
    try {
      const next = await Promise.all(
        rows.map((r) => enrichRow(r.student, selectedYear, selectedTerm))
      );
      setRows(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh ledger');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!rows.length) return;
    void refreshLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedTerm]);

  function openPay(row: FeeRegistryRow, kind: 'fees' | 'requirements') {
    setWizardStudent(row.student);
    setWizard(kind);
    setSelectedStudent(null);
  }

  function handlePaymentSuccess(payload: PaymentSuccessPayload) {
    setLastPayment(payload);
    if (payload.kind !== 'school-fees') return;
    setRows((prev) =>
      prev.map((row) => {
        const matchUid = payload.studentUid && row.studentUid === payload.studentUid;
        const matchName = row.name === payload.studentName;
        if (!matchUid && !matchName) return row;
        const paid = row.paid + payload.amountPaid;
        const balance =
          row.totalBill == null
            ? payload.remainingBalance ?? null
            : Math.max(0, row.totalBill - paid);
        return {
          ...row,
          paid,
          balance,
          status: deriveStatus(row.totalBill, paid),
        };
      })
    );
  }

  function closeWizard() {
    setWizard(null);
  }

  const wizardCtx = wizardStudent
    ? {
        ...studentWizardContext(wizardStudent),
        preferredYear: selectedYear,
        preferredTerm: selectedTerm,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#C87800] via-[#E09A1A] to-[#FCB038] pb-24 pt-28 sm:pb-28 sm:pt-32">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[40px] border-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full border-[28px] border-white/10"
          aria-hidden
        />
        <Container className="relative max-w-[1280px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
            Financial Repository
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Student Fee Payment
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Look up any learner by ShuleCode or SDMS, review expected fees from the approved Shule+
            circular, and pay school fees or requirements — no login required.
          </p>
        </Container>
      </section>

      {/* Dashboard card overlapping hero */}
      <Container className="relative z-10 max-w-[1280px] -mt-16 pb-20 sm:-mt-20">
        {lastPayment ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3.5"
          >
            <div>
              <p className="text-sm font-bold text-navy-900">Payment confirmed</p>
              <p className="text-[12.5px] text-navy-700/65">
                {frw(lastPayment.amountPaid)} · {lastPayment.studentName} · {lastPayment.reference}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadModernReceipt({
                    kind: lastPayment.kind,
                    reference: lastPayment.reference,
                    studentName: lastPayment.studentName,
                    schoolName:
                      rows.find((r) => r.studentUid === lastPayment.studentUid)?.schoolName ||
                      'School',
                    studentClass:
                      rows.find((r) => r.studentUid === lastPayment.studentUid)?.grade || '—',
                    studentUid: lastPayment.studentUid,
                    academicYear: lastPayment.academicYear,
                    term: lastPayment.term,
                    method: lastPayment.method,
                    lines: lastPayment.lines,
                    amountPaid: lastPayment.amountPaid,
                    remainingBalance: lastPayment.remainingBalance,
                    paidAt: new Date(),
                  })
                }
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#000435] px-4 text-xs font-semibold text-white"
              >
                <Download className="h-3.5 w-3.5 text-[#FCB038]" />
                Download receipt
              </button>
              <button
                type="button"
                onClick={() => setLastPayment(null)}
                className="inline-flex h-10 items-center rounded-xl border border-navy-900/10 bg-white px-3 text-xs font-semibold text-navy-900"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        ) : null}

        <div className="overflow-hidden rounded-[24px] border border-navy-900/[0.06] bg-white shadow-[0_24px_64px_-24px_rgba(0,4,53,0.22)]">
          {/* Stats + exports */}
          <div className="grid gap-0 border-b border-navy-900/[0.06] lg:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <StatCell
                icon={Users}
                label="Active Students"
                value={String(stats.active)}
                accent="#2355FF"
              />
              <StatCell
                icon={Wallet2}
                label="Revenue Collected"
                value={frw(stats.revenue)}
                accent="#FCB038"
              />
              <StatCell
                icon={TrendingUp}
                label="Outstanding Balance"
                value={frw(stats.outstanding)}
                accent="#8640AA"
              />
              <StatCell
                icon={Percent}
                label="Collection Rate"
                value={`${stats.rate}%`}
                accent="#20D6C7"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-navy-900/[0.06] px-4 py-3 lg:border-l lg:border-t-0 lg:px-5">
              <button
                type="button"
                onClick={() => exportCsv(filteredStudents, selectedYear, selectedTerm)}
                disabled={!filteredStudents.length}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-navy-900/10 px-3 text-xs font-semibold text-navy-900 transition hover:bg-navy-900/[0.03] disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportCsv(filteredStudents, selectedYear, selectedTerm)}
                disabled={!filteredStudents.length}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-navy-900/10 px-3 text-xs font-semibold text-navy-900 transition hover:bg-navy-900/[0.03] disabled:opacity-40"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Excel
              </button>
              <button
                type="button"
                title="Notify arrears by SMS or in-app"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#000435] px-3 text-xs font-semibold text-white opacity-70"
              >
                <Bell className="h-3.5 w-3.5 text-[#FCB038]" />
                Notify
              </button>
            </div>
          </div>

          {/* Lookup + filters */}
          <div className="space-y-4 border-b border-navy-900/[0.06] bg-[#FAFBFC] px-4 py-4 sm:px-6">
            <form onSubmit={handleLookup} className="flex flex-col gap-2.5 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-[#8640AA]/25 bg-white px-4 py-3 focus-within:border-[#2355FF]/50 focus-within:ring-4 focus-within:ring-[#2355FF]/10">
                <Search className="h-4 w-4 shrink-0 text-navy-700/35" />
                <input
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Look up by ShuleCode or SDMS Code"
                  className="min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-700/35"
                />
              </div>
              <button
                type="submit"
                disabled={lookingUp || !lookupQuery.trim()}
                className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#000435] px-6 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-45 sm:min-w-[140px]"
              >
                {lookingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#FCB038]" />
                ) : (
                  <Search className="h-4 w-4 text-[#FCB038]" />
                )}
                Lookup
              </button>
            </form>

            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-navy-700/45">
                  <Filter className="h-3.5 w-3.5" />
                  Filter by class
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ClassChip
                    active={selectedClass === 'all'}
                    onClick={() => setSelectedClass('all')}
                    label="View All"
                  />
                  {classNames.map((c) => (
                    <ClassChip
                      key={c}
                      active={selectedClass === c}
                      onClick={() => setSelectedClass(c)}
                      label={c}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-10 rounded-xl border border-navy-900/10 bg-white px-3 text-sm text-navy-900 outline-none focus:border-[#2355FF]/40"
                >
                  <option value="all">All status</option>
                  <option value="full_pay">Paid</option>
                  <option value="not_paid">Not paid</option>
                  <option value="remain_pay">Partial payment</option>
                  <option value="no_fee_card">No fee card</option>
                </select>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="h-10 rounded-xl border border-navy-900/10 bg-white px-3 text-sm text-navy-900 outline-none focus:border-[#2355FF]/40"
                >
                  {termOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-10 rounded-xl border border-navy-900/10 bg-white px-3 text-sm text-navy-900 outline-none focus:border-[#2355FF]/40"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void refreshLedger()}
                  disabled={refreshing || !rows.length}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-navy-900/10 bg-white px-3 text-sm font-semibold text-navy-900 hover:bg-navy-900/[0.03] disabled:opacity-40"
                >
                  {refreshing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Sync
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-700/35" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search registry by name or student ID…"
                className="h-11 w-full rounded-xl border border-navy-900/10 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-navy-900/[0.06] bg-[#F8F9FA] text-[11px] font-bold uppercase tracking-wide text-navy-700/45">
                  <th className="px-4 py-3 sm:px-6">Student Info</th>
                  <th className="hidden px-3 py-3 md:table-cell">Class Registry</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Revenue (Expected)</th>
                  <th className="hidden px-3 py-3 sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refreshing && !paged.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-navy-700/55">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-amber-500" />
                      Syncing distributed ledger…
                    </td>
                  </tr>
                ) : null}

                {!lookingUp && !refreshing && !paged.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <GraduationCap className="mx-auto h-8 w-8 text-navy-900/20" />
                      <p className="mt-3 font-semibold text-navy-900">No students in registry yet</p>
                      <p className="mt-1 text-sm text-navy-700/55">
                        Look up a ShuleCode or SDMS code above to add a learner and load Shule+ fees.
                      </p>
                    </td>
                  </tr>
                ) : null}

                {paged.map((row) => {
                  const settled = row.status === 'full_pay';
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedStudent(row)}
                      className="cursor-pointer border-b border-navy-900/[0.05] transition hover:bg-[#FCB038]/[0.04]"
                    >
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#000435] font-display text-sm font-bold text-[#FCB038]">
                            {initialOf(row.name)}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                                settled ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                          </span>
                          <span>
                            <span className="block font-semibold text-navy-900">{row.name}</span>
                            <span className="block font-mono text-[11.5px] text-navy-700/50">
                              {row.studentUid}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3.5 md:table-cell">
                        <span className="font-medium text-navy-900">{row.grade}</span>
                        <span className="mt-0.5 block text-[11px] text-navy-700/45">
                          {row.schoolName}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3.5 lg:table-cell">
                        <span className="font-semibold text-navy-900">{frw(row.totalBill)}</span>
                        <span className="mt-0.5 block text-[11.5px] text-navy-700/50">
                          Paid: {frw(row.paid)}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3.5 sm:table-cell">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(row.status)}`}
                        >
                          {row.status === 'remain_pay' || row.status === 'not_paid'
                            ? `Bal: ${frw(row.balance)}`
                            : statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right sm:px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <IconAction
                            label="Email"
                            onClick={() => undefined}
                            icon={Mail}
                          />
                          <IconAction
                            label="View"
                            onClick={() => setSelectedStudent(row)}
                            icon={Eye}
                          />
                          <IconAction
                            label="Pay fees"
                            onClick={() => openPay(row, 'fees')}
                            icon={Wallet2}
                            primary
                          />
                          <IconAction
                            label="More"
                            onClick={() => setSelectedStudent(row)}
                            icon={MoreHorizontal}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-900/[0.06] px-4 py-3.5 sm:px-6">
            <p className="text-[12.5px] text-navy-700/55">
              <span className="font-semibold text-navy-900">{filteredStudents.length}</span> record
              {filteredStudents.length === 1 ? '' : 's'}
              <span className="mx-1.5 text-navy-900/20">·</span>
              {selectedTerm}
              <span className="mx-1.5 text-navy-900/20">·</span>
              {selectedYear}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-900/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[64px] text-center text-xs font-semibold text-navy-900">
                Page {String(page).padStart(2, '0')}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-900/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Container>

      <StudentDetailDrawer
        row={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onPayFees={(r) => openPay(r, 'fees')}
        onPayRequirements={(r) => openPay(r, 'requirements')}
      />

      {wizardCtx ? (
        <>
          <PaymentWizardModal
            open={wizard === 'fees'}
            onClose={closeWizard}
            title="Pay school fees"
          >
            <SchoolFeesPay
              key={`fees-${wizardStudent?.id}-${selectedYear}-${selectedTerm}`}
              student={wizardCtx}
              onPaymentSuccess={handlePaymentSuccess}
              onClose={closeWizard}
            />
          </PaymentWizardModal>
          <PaymentWizardModal
            open={wizard === 'requirements'}
            onClose={closeWizard}
            title="Pay student requirements"
          >
            <RequirementsPay
              key={`req-${wizardStudent?.id}-${selectedYear}-${selectedTerm}`}
              student={wizardCtx}
              onPaymentSuccess={handlePaymentSuccess}
              onClose={closeWizard}
            />
          </PaymentWizardModal>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponents                                                       */
/* ------------------------------------------------------------------ */

function StatCell({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="border-b border-navy-900/[0.05] px-4 py-4 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-5">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wide text-navy-700/45">{label}</p>
      </div>
      <p className="mt-2 font-display text-lg font-extrabold text-navy-900 sm:text-xl">{value}</p>
    </div>
  );
}

function ClassChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-[#000435] text-white'
          : 'border border-navy-900/10 bg-white text-navy-700/70 hover:border-navy-900/20'
      }`}
    >
      {label}
    </button>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        primary
          ? 'border-transparent bg-[#000435] text-[#FCB038] hover:bg-navy-800'
          : 'border-navy-900/10 text-navy-700/60 hover:bg-navy-900/[0.04]'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function StudentDetailDrawer({
  row,
  onClose,
  onPayFees,
  onPayRequirements,
}: {
  row: FeeRegistryRow | null;
  onClose: () => void;
  onPayFees: (r: FeeRegistryRow) => void;
  onPayRequirements: (r: FeeRegistryRow) => void;
}) {
  useEffect(() => {
    if (!row) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [row, onClose]);

  if (typeof document === 'undefined') return null;

  const settled = row?.status === 'full_pay';

  return createPortal(
    <AnimatePresence>
      {row ? (
        <motion.div
          className="fixed inset-0 z-[70] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close drawer"
            className="absolute inset-0 bg-navy-900/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative z-10 flex h-full w-full max-w-[420px] flex-col overflow-y-auto bg-white shadow-[-16px_0_48px_-20px_rgba(0,4,53,0.35)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-navy-900/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#000435] font-display text-lg font-bold text-[#FCB038]">
                  {initialOf(row.name)}
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-navy-900">{row.name}</p>
                  <p className="font-mono text-[11.5px] text-navy-700/50">Ledger · {row.studentUid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-navy-900/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div
                className={`rounded-2xl px-4 py-3 text-[12.5px] font-semibold ${
                  settled
                    ? 'bg-emerald-500/12 text-[#0D9B90]'
                    : 'bg-amber-500/15 text-amber-900'
                }`}
              >
                {settled ? (
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4" /> Fully Settled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Outstanding Liability
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat label="Total Paid" value={frw(row.paid)} />
                <MiniStat label="Balance Due" value={frw(row.balance)} highlight />
                <MiniStat label="Expected Total" value={frw(row.totalBill)} />
                <MiniStat label="Payment Status" value={statusLabel(row.status)} />
              </div>

              <div className="rounded-2xl border border-navy-900/[0.07] p-4 text-[12.5px]">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-navy-700/45">
                  Student context
                </p>
                <p className="flex items-center gap-1.5 text-navy-700/70">
                  <Building2 className="h-3.5 w-3.5 text-amber-500" />
                  {row.schoolName}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-navy-700/70">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                  {row.grade} · {row.academicYear} · {row.term}
                </p>
                {row.guardianName ? (
                  <p className="mt-1.5 text-navy-700/70">
                    Guardian: <span className="font-semibold text-navy-900">{row.guardianName}</span>
                    {row.parentPhone ? ` · ${row.parentPhone}` : ''}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onPayFees(row)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#000435] py-3 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  <Wallet2 className="h-4 w-4 text-[#FCB038]" />
                  Pay school fees
                </button>
                <button
                  type="button"
                  onClick={() => onPayRequirements(row)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900/12 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-900/[0.03]"
                >
                  <ShoppingBag className="h-4 w-4 text-[#2355FF]" />
                  Pay requirements
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#F8F9FA] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-navy-700/45">{label}</p>
      <p
        className={`mt-0.5 text-sm font-bold ${highlight ? 'text-[#FCB038]' : 'text-navy-900'}`}
      >
        {value}
      </p>
    </div>
  );
}

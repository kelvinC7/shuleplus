'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, GraduationCap, Layers, Loader2, Printer, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { usePrintCardSchools } from '@/hooks/use-print-card-schools';
import {
  fetchPrintQueue,
  fetchReprintRequests,
  fetchStats,
  type CardStats,
} from '@/services/print-card-api';

export function DashboardView() {
  const { schools, selectedSchool, setSelectedSchool, canSelectSchools, loading: schoolsLoading } =
    usePrintCardSchools();
  const [studentStats, setStudentStats] = useState<CardStats | null>(null);
  const [staffStats, setStaffStats] = useState<CardStats | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [pendingReprints, setPendingReprints] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedSchool) {
      setStudentStats(null);
      setStaffStats(null);
      setQueueCount(0);
      setPendingReprints(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const orgId = selectedSchool.id;
      const [students, staff, queue, reprints] = await Promise.all([
        fetchStats(orgId, 'STUDENT'),
        fetchStats(orgId, 'STAFF'),
        fetchPrintQueue(orgId),
        fetchReprintRequests({ organizationId: canSelectSchools ? orgId : undefined, status: 'PENDING' }),
      ]);
      setStudentStats(students);
      setStaffStats(staff);
      setQueueCount(queue.length);
      setPendingReprints(reprints.length);
    } catch {
      setStudentStats(null);
      setStaffStats(null);
      setQueueCount(0);
      setPendingReprints(0);
    } finally {
      setLoading(false);
    }
  }, [selectedSchool, canSelectSchools]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCards = (studentStats?.total ?? 0) + (staffStats?.total ?? 0);
  const notPrinted = (studentStats?.notPrinted ?? 0) + (staffStats?.notPrinted ?? 0);
  const printed = (studentStats?.printed ?? 0) + (staffStats?.printed ?? 0);
  const needReprint = (studentStats?.reprintRequired ?? 0) + (staffStats?.reprintRequired ?? 0);

  if (schoolsLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {selectedSchool ? selectedSchool.name : 'Select a school to view card statistics.'}
          </p>
        </div>
        {canSelectSchools && schools.length > 1 && (
          <label className="min-w-[200px] space-y-1">
            <span className="text-[11px] font-bold uppercase text-muted">School</span>
            <select
              value={selectedSchool?.id ?? ''}
              onChange={(e) => {
                const school = schools.find((s) => s.id === e.target.value) ?? null;
                setSelectedSchool(school);
              }}
              className="input"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Students" value={studentStats?.total ?? 0} />
        <StatCard label="Total Staff" value={staffStats?.total ?? 0} accent="text-slate-600" />
        <StatCard label="Total Cards" value={totalCards} />
        <StatCard label="Not Printed" value={notPrinted} accent="text-slate-600" />
        <StatCard label="Printed" value={printed} accent="text-emerald-700" />
        <StatCard label="Need Reprint" value={needReprint} accent="text-amber-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/cards/students"
          className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
        >
          <GraduationCap className="h-6 w-6 text-navy" />
          <p className="mt-3 font-semibold text-navy group-hover:text-primary">Students</p>
          <p className="mt-1 text-sm text-muted">Browse, select, and print student ID cards.</p>
        </Link>
        <Link
          href="/cards/staff"
          className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
        >
          <Users className="h-6 w-6 text-navy" />
          <p className="mt-3 font-semibold text-navy group-hover:text-primary">Staff</p>
          <p className="mt-1 text-sm text-muted">Browse, select, and print staff ID cards.</p>
        </Link>
        <Link
          href="/cards/queue"
          className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
        >
          <Layers className="h-6 w-6 text-navy" />
          <p className="mt-3 font-semibold text-navy group-hover:text-primary">
            Print Queue {queueCount > 0 && <span className="text-primary">({queueCount})</span>}
          </p>
          <p className="mt-1 text-sm text-muted">Resume or manage batches ready to print.</p>
        </Link>
        <Link
          href="/cards/reprint-requests"
          className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
        >
          <ClipboardList className="h-6 w-6 text-navy" />
          <p className="mt-3 font-semibold text-navy group-hover:text-primary">
            Reprint Requests {pendingReprints > 0 && <span className="text-amber-700">({pendingReprints})</span>}
          </p>
          <p className="mt-1 text-sm text-muted">Track lost, damaged, or replacement card requests.</p>
        </Link>
      </div>

      {(notPrinted > 0 || needReprint > 0) && selectedSchool && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <Printer className="h-5 w-5 shrink-0 text-navy" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy">Ready to print</p>
            <p className="text-sm text-muted">
              {notPrinted > 0 && `${notPrinted} card(s) never printed.`}
              {notPrinted > 0 && needReprint > 0 && ' '}
              {needReprint > 0 && `${needReprint} card(s) need reprinting.`}
            </p>
          </div>
          <Link
            href={needReprint > 0 ? '/cards/students?status=REPRINT_REQUIRED' : '/cards/students?status=NOT_PRINTED'}
            className="inline-flex items-center rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary"
          >
            Go to Students
          </Link>
        </div>
      )}
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/auth-context';
import { BookOpen, BookCopy, BookCheck, AlertTriangle, BookX, Wrench, CalendarCheck, Users } from 'lucide-react';

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="stat-card flex min-h-[112px] animate-scale-in flex-col rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.14)] sm:p-5">
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[#FCB038]"
          style={{ backgroundColor: '#000435' }}
        >
          {icon}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000435]">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#000435]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { summary } = useAuth();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Library</p>
          <h1 className="text-xl font-bold text-navy">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Books" value={summary?.totalBooks ?? 0} icon={<BookOpen size={20} />} />
        <StatCard label="Available" value={summary?.availableBooks ?? 0} icon={<BookCheck size={20} />} />
        <StatCard label="Borrowed" value={summary?.borrowedBooks ?? 0} icon={<BookCopy size={20} />} />
        <StatCard label="Overdue" value={summary?.overdueBooks ?? 0} icon={<AlertTriangle size={20} />} />
        <StatCard label="Lost" value={summary?.lostBooks ?? 0} icon={<BookX size={20} />} />
        <StatCard label="Damaged" value={summary?.damagedBooks ?? 0} icon={<Wrench size={20} />} />
        <StatCard label="Borrowed Today" value={summary?.booksBorrowedToday ?? 0} icon={<CalendarCheck size={20} />} />
        <StatCard label="Visits Today" value={summary?.libraryVisitsToday ?? 0} icon={<Users size={20} />} />
      </div>
    </div>
  );
}
